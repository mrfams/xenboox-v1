"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@xenboox/ui";
import {
  Coins,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  ArrowRightLeft,
  CalendarDays,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";

export function CurrencySection() {
  const { data: settings, refetch: refetchSettings } =
    trpc.currency.getSettings.useQuery();
  const { data: currencies } = trpc.currency.listCurrencies.useQuery();
  const { data: rates, refetch: refetchRates } =
    trpc.currency.listRates.useQuery();
  const { data: revaluationRuns, refetch: refetchRuns } =
    trpc.currency.getRevaluation.useQuery();

  const utils = trpc.useUtils();

  // ── Conversion tool ──
  const base = settings?.baseCurrency ?? currencies?.[0]?.code ?? "USD";
  const [convertFrom, setConvertFrom] = useState(base);
  const [convertTo, setConvertTo] = useState(settings?.baseCurrency ?? base);
  const [convertAmount, setConvertAmount] = useState("100");

  // ── Add rate dialog ──
  const [showAdd, setShowAdd] = useState(false);
  const [rateForm, setRateForm] = useState({
    fromCurrency: base,
    toCurrency: settings?.baseCurrency ?? base,
    rate: "",
    asOf: new Date().toISOString().slice(0, 10),
  });

  const upsertRate = trpc.currency.upsertRate.useMutation({
    onSuccess: () => {
      toast.success("Exchange rate saved");
      setShowAdd(false);
      refetchRates();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteRate = trpc.currency.deleteRate.useMutation({
    onSuccess: () => {
      toast.success("Exchange rate deleted");
      refetchRates();
    },
    onError: (error) => toast.error(error.message),
  });

  // ── Revaluation ──
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const runRevaluation = trpc.currency.runRevaluation.useMutation({
    onSuccess: () => {
      toast.success("FX revaluation completed");
      refetchRuns();
      refetchSettings();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleConvert = async () => {
    const amount = Number(convertAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    try {
      const result = await utils.client.currency.convert.query({
        fromCurrency: convertFrom,
        toCurrency: convertTo,
        amount,
      });
      toast.success(
        `${result.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${result.fromCurrency} = ${result.convertedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${result.toCurrency} (${result.source})`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Conversion failed");
    }
  };

  const openAddDialog = () => {
    const baseNow = settings?.baseCurrency ?? currencies?.[0]?.code ?? "USD";
    setRateForm({
      fromCurrency: baseNow,
      toCurrency: baseNow,
      rate: "",
      asOf: new Date().toISOString().slice(0, 10),
    });
    setShowAdd(true);
  };

  const submitRate = () => {
    const rate = Number(rateForm.rate);
    if (!rate || rate <= 0) {
      toast.error("Enter a valid rate");
      return;
    }
    upsertRate.mutate({
      fromCurrency: rateForm.fromCurrency,
      toCurrency: rateForm.toCurrency,
      rate,
      asOf: rateForm.asOf,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Base Currency
          </CardTitle>
          <CardDescription>
            The functional currency your general ledger records in. FX
            revaluations convert foreign balances back to this currency.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            {settings?.baseCurrency ?? "USD"}
          </div>
          <Badge variant="secondary" className="text-sm">
            {settings?.rateCount ?? 0} entity rate
            {(settings?.rateCount ?? 0) === 1 ? "" : "s"} configured
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Quick Conversion
          </CardTitle>
          <CardDescription>
            Get the latest conversion between two currencies using your entity
            rates first, then the global ECB-synced pool.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <Label>Amount</Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={convertAmount}
                onChange={(e) => setConvertAmount(e.target.value)}
                className="w-32"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>From</Label>
              <Select value={convertFrom} onValueChange={setConvertFrom}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies?.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>To</Label>
              <Select value={convertTo} onValueChange={setConvertTo}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies?.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleConvert}>Convert</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              Exchange Rates
            </CardTitle>
            <CardDescription>
              Entity-scoped rates keyed by currency pair and as-of date.
            </CardDescription>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-1" /> Add Rate
          </Button>
        </CardHeader>
        <CardContent>
          {rates && rates.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No entity rates yet. Add one or rely on the global ECB-synced
              pool.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" /> As of
                  </TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates?.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-medium">
                      {rate.fromCurrency}
                    </TableCell>
                    <TableCell>{rate.toCurrency}</TableCell>
                    <TableCell className="tabular-nums">{rate.rate}</TableCell>
                    <TableCell>{rate.asOf}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{rate.source}</Badge>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-error-clay"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete rate</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the {rate.fromCurrency} →{" "}
                              {rate.toCurrency} rate for {rate.asOf}. Global
                              rates are not affected.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteRate.mutate({ id: rate.id })}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              FX Revaluation
            </CardTitle>
            <CardDescription>
              Compute unrealized gain/loss on foreign-currency journal lines for
              a period, converted to your base currency.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <Label>Period</Label>
              <Input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-40"
              />
            </div>
            <Button
              onClick={() => runRevaluation.mutate({ period })}
              disabled={runRevaluation.isPending}
            >
              {runRevaluation.isPending && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              Run Revaluation
            </Button>
          </div>

          {revaluationRuns && revaluationRuns.length > 0 && (
            <div className="mt-6">
              <h4 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                Recent runs
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Base</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Gain/Loss</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Run at</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revaluationRuns.map((run) => {
                    const total = (run.totals ?? []).reduce(
                      (acc: number, t: { gainLoss?: number }) =>
                        acc + (t.gainLoss ?? 0),
                      0,
                    );
                    return (
                      <TableRow key={run.id}>
                        <TableCell>{run.period}</TableCell>
                        <TableCell>{run.baseCurrency}</TableCell>
                        <TableCell className="tabular-nums">
                          {(run.totals ?? []).length} currencies
                        </TableCell>
                        <TableCell
                          className={`tabular-nums ${
                            total >= 0
                              ? "text-balanced-green dark:text-emerald-400"
                              : "text-error-clay dark:text-red-400"
                          }`}
                        >
                          {total >= 0 ? "+" : ""}
                          {total.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              run.status === "completed"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {run.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {run.runAt
                            ? new Date(run.runAt).toLocaleString()
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add exchange rate</DialogTitle>
            <DialogDescription>
              Save an entity-scoped rate override. It takes precedence over the
              global pool for this pair and date.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>From</Label>
                <Select
                  value={rateForm.fromCurrency}
                  onValueChange={(v) =>
                    setRateForm({ ...rateForm, fromCurrency: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies?.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>To</Label>
                <Select
                  value={rateForm.toCurrency}
                  onValueChange={(v) =>
                    setRateForm({ ...rateForm, toCurrency: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies?.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>
                Rate (1 {rateForm.fromCurrency} to {rateForm.toCurrency})
              </Label>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 67.5"
                value={rateForm.rate}
                onChange={(e) =>
                  setRateForm({ ...rateForm, rate: e.target.value })
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>As of</Label>
              <Input
                type="date"
                value={rateForm.asOf}
                onChange={(e) =>
                  setRateForm({ ...rateForm, asOf: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAdd(false)}
              disabled={upsertRate.isPending}
            >
              Cancel
            </Button>
            <Button onClick={submitRate} disabled={upsertRate.isPending}>
              {upsertRate.isPending && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              Save Rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
