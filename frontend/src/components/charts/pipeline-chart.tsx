import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PipelineBreakdown } from "@/utils/types";
import { useLanguage } from "@/providers/language-provider";

export function PipelineChart({ data }: { data: PipelineBreakdown[] }) {
  const { direction } = useLanguage();
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={direction === "rtl" ? [...data].reverse() : data}>
        <XAxis dataKey="stage" reversed={direction === "rtl"} tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="value" fill="#0057B8" radius={[12, 12, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
