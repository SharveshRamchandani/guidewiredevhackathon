import { WorkerLayout } from "@/components/WorkerLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const coverageData = [
  { type: "Heavy Rain (>20mm)", payout: "60%", max: "₹1,200" },
  { type: "Poor AQI (>300)", payout: "50%", max: "₹1,000" },
  { type: "Heatwave (>42°C)", payout: "40%", max: "₹800" },
  { type: "Platform Outage (>2hr)", payout: "45%", max: "₹900" },
];

const pastPolicies = [
  { id: "POL-2026-0846", period: "17 Feb – 23 Feb 2026", premium: "₹35", claims: 1, payout: "₹450" },
  { id: "POL-2026-0845", period: "10 Feb – 16 Feb 2026", premium: "₹35", claims: 0, payout: "₹0" },
  { id: "POL-2026-0844", period: "3 Feb – 9 Feb 2026", premium: "₹32", claims: 2, payout: "₹720" },
];

const Policy = () => {
  const [autoRenew, setAutoRenew] = useState(true);

  return (
    <WorkerLayout>
      <div>
        <PageHeader title="Policy Details" description="Manage your insurance coverage" />

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-display text-lg">Standard Weekly Plan</CardTitle>
                <CardDescription>Policy ID: POL-2026-0847</CardDescription>
              </div>
              <StatusBadge status="active" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-muted-foreground">Premium</span><p className="font-medium">₹35/week</p></div>
              <div><span className="text-muted-foreground">Max Coverage</span><p className="font-medium">₹2,000/week</p></div>
              <div><span className="text-muted-foreground">Valid</span><p className="font-medium">24 Feb – 2 Mar</p></div>
              <div><span className="text-muted-foreground">Zone</span><p className="font-medium">Bandra, Mumbai</p></div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
                <Label>Auto-renew policy</Label>
              </div>
              <Dialog>
                <DialogTrigger asChild><Button variant="outline">Upgrade Plan</Button></DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle className="font-display">Choose a Plan</DialogTitle></DialogHeader>
                  <RadioGroup defaultValue="standard" className="space-y-3">
                    {[
                      { value: "basic", label: "Basic", price: "₹19/week", coverage: "₹1,000" },
                      { value: "standard", label: "Standard", price: "₹35/week", coverage: "₹2,000" },
                      { value: "premium", label: "Premium", price: "₹59/week", coverage: "₹5,000" },
                    ].map((plan) => (
                      <div key={plan.value} className="flex items-center gap-3 border rounded-lg p-4">
                        <RadioGroupItem value={plan.value} id={plan.value} />
                        <Label htmlFor={plan.value} className="flex-1 cursor-pointer">
                          <div className="flex justify-between">
                            <span className="font-semibold">{plan.label}</span>
                            <span className="text-primary font-semibold">{plan.price}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">Max coverage: {plan.coverage}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  <Button className="w-full mt-4">Confirm Upgrade</Button>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Coverage Breakdown */}
        <Card className="mb-6">
          <CardHeader><CardTitle className="font-display text-lg">Coverage Breakdown</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Disruption Type</TableHead>
                  <TableHead>Payout %</TableHead>
                  <TableHead>Max Payout</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coverageData.map((c) => (
                  <TableRow key={c.type}>
                    <TableCell>{c.type}</TableCell>
                    <TableCell><Badge variant="secondary">{c.payout}</Badge></TableCell>
                    <TableCell>{c.max}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Policy History */}
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Policy History</CardTitle></CardHeader>
          <CardContent>
            <Accordion type="single" collapsible>
              {pastPolicies.map((p) => (
                <AccordionItem key={p.id} value={p.id}>
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-4">
                      <span className="font-medium">{p.id}</span>
                      <span className="text-muted-foreground">{p.period}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-3 gap-4 text-sm pl-4">
                      <div><span className="text-muted-foreground">Premium</span><p>{p.premium}</p></div>
                      <div><span className="text-muted-foreground">Claims</span><p>{p.claims}</p></div>
                      <div><span className="text-muted-foreground">Total Payout</span><p>{p.payout}</p></div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </WorkerLayout>
  );
};

export default Policy;
