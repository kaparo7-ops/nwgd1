import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { CashflowPoint } from "@/utils/types";
import { useLanguage } from "@/providers/language-provider";

export function CashflowChart({ data }: { data: CashflowPoint[] }) {
  const { direction } = useLanguage();
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart
        data={direction === "rtl" ? [...data].reverse() : data}
        margin={{ top: 16, right: 24, left: 0, bottom: 8 }}
      >
        <defs>
          <linearGradient id="colorPipeline" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0057B8" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#0057B8" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorInvoices" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00A19A" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#00A19A" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" reversed={direction === "rtl"} />
        <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
        <Tooltip />
        <Legend />
        <Area
          type="monotone"
          dataKey="pipeline"
          stroke="#0057B8"
          fill="url(#colorPipeline)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="invoices"
          stroke="#00A19A"
          fill="url(#colorInvoices)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="expenses"
          stroke="#F27F0C"
          fill="#F27F0C15"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
