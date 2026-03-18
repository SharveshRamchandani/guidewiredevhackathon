const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');
const { AppError } = require('../middleware/errorHandler');

const MAX_MESSAGE_LENGTH = 1000;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_CHAT_MODEL || 'llama-3.1-8b-instant';

let cachedGroqApiKey;
let checkedMlEnv = false;

function normalizeMessage(message) {
  return String(message || '').trim().toLowerCase();
}

function buildRoleLabel(role) {
  if (role === 'super_admin') return 'super admin';
  if (role === 'admin') return 'admin';
  if (role === 'worker') return 'worker';
  return 'user';
}

function buildReply(message, context = {}) {
  const normalized = normalizeMessage(message);
  const roleLabel = buildRoleLabel(context.role);
  const page = context.page || 'this screen';

  if (!normalized) {
    throw new AppError('INVALID_CHAT_MESSAGE', 'Message is required.', 400);
  }

  if (normalized.length > MAX_MESSAGE_LENGTH) {
    throw new AppError(
      'CHAT_MESSAGE_TOO_LONG',
      `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
      400
    );
  }

  if (/\b(hi|hello|hey)\b/.test(normalized)) {
    return `Hi. I can help with GigShield policies, claims, payouts, notifications, and risk events from ${page}.`;
  }

  if (/\b(policy|plan|premium|coverage)\b/.test(normalized)) {
    return `For policy help, check the Policy or Plans section. I can explain plan selection, weekly premiums, coverage limits, and what each plan protects against.`;
  }

  if (/\b(claim|file claim|raise claim|approve claim|reject claim)\b/.test(normalized)) {
    return roleLabel === 'worker'
      ? `Workers can use the Claims page to review submitted claims and track their status. If you need to file a new claim, use the claim flow exposed by your current policy coverage.`
      : `Admins can review claim queues, approval decisions, and rejection reasons from the claims screens. If you want, ask about claim statuses, approval flow, or payout dependencies.`;
  }

  if (/\b(payout|payment|upi)\b/.test(normalized)) {
    return roleLabel === 'worker'
      ? `Payout questions usually map to the Payouts page. I can help explain payout status, UPI issues, or how approved claims move into processing.`
      : `Payout processing depends on approved claims and valid worker UPI details. Admin users should review the claim decision first, then track payout state from the payout workflow.`;
  }

  if (/\b(weather|aqi|risk|trigger|disruption|income)\b/.test(normalized)) {
    return `GigShield uses environmental and disruption signals like weather, AQI, income shock, and trigger models. I can explain those signals, but I do not execute ML predictions directly from this chat endpoint.`;
  }

  if (/\b(notification|alert|bell)\b/.test(normalized)) {
    return `Notifications are available from the notification panel. Unread counts are fetched separately, so if something looks stale, refresh the page or reopen the panel.`;
  }

  if (/\b(profile|kyc|aadhaar|register)\b/.test(normalized)) {
    return roleLabel === 'worker'
      ? `Profile and registration issues usually involve KYC, Aadhaar last 4 digits, city, platform, or UPI details. I can explain those requirements, but profile updates still happen through the app forms.`
      : `Admin profile access is handled from the admin profile screen. For worker registration issues, I can explain the onboarding fields and common validation failures.`;
  }

  if (/\b(help|what can you do)\b/.test(normalized)) {
    return `I can answer product-level questions about policies, claims, payouts, notifications, onboarding, and risk features. For account-specific actions, use the page controls on ${page}.`;
  }

  return `I understood this as a ${roleLabel} question from ${page}, but I do not have enough detail yet. Ask about policies, claims, payouts, onboarding, notifications, or risk triggers.`;
}

function getGroqApiKey() {
  if (process.env.GROQ_API_KEY) {
    return process.env.GROQ_API_KEY;
  }

  if (checkedMlEnv) {
    return cachedGroqApiKey || null;
  }

  checkedMlEnv = true;

  const mlEnvPath = path.resolve(__dirname, '../../../ml/.env');
  if (!fs.existsSync(mlEnvPath)) {
    return null;
  }

  const parsed = dotenv.parse(fs.readFileSync(mlEnvPath));
  cachedGroqApiKey = parsed.GROQ_API_KEY || null;

  if (cachedGroqApiKey) {
    process.env.GROQ_API_KEY = cachedGroqApiKey;
  }

  return cachedGroqApiKey;
}

async function generateGroqReply(message, context = {}) {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    return null;
  }

  const systemPrompt = [
    'You are the GigShield in-app assistant.',
    'Answer in 2 to 4 concise sentences.',
    'Focus on GigShield product guidance for policies, claims, payouts, onboarding, notifications, and risk signals.',
    'Do not invent account-specific data, claim statuses, payouts, or policy details you were not given.',
    'If the user asks for an action you cannot perform from chat, tell them which app section to use next.',
  ].join(' ');

  const userPrompt = [
    `Role: ${context.role || 'guest'}`,
    `Page: ${context.page || 'unknown'}`,
    `User message: ${message}`,
  ].join('\n');

  const response = await axios.post(
    GROQ_API_URL,
    {
      model: GROQ_MODEL,
      temperature: 0.3,
      max_tokens: 180,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    },
    {
      timeout: 10000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const reply = response.data?.choices?.[0]?.message?.content?.trim();
  return reply || null;
}

async function sendChatMessage({ message, context }) {
  const fallbackReply = buildReply(message, context);

  let reply = fallbackReply;
  let source = 'fallback';

  try {
    const groqReply = await generateGroqReply(message, context);
    if (groqReply) {
      reply = groqReply;
      source = 'groq';
    }
  } catch (error) {
    console.warn(`[Chat] Groq fallback engaged: ${error.message || 'Unknown Groq error'}`);
  }

  return {
    reply,
    source,
    context: {
      role: context?.role || 'guest',
      page: context?.page || null,
    },
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  sendChatMessage,
};
