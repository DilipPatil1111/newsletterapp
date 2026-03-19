import { Section, Text } from "@react-email/components";
import * as React from "react";

export interface Stat {
  value: string;
  label: string;
  color: string;
}

interface StatsBarProps {
  stats?: Stat[];
}

const defaultStats: Stat[] = [
  { value: "40%", label: "Avg Salary Hike", color: "#4338CA" },
  { value: "92%", label: "Placement Rate", color: "#047857" },
  { value: "100+", label: "Hiring Partners", color: "#B45309" },
];

export function StatsBar({ stats = defaultStats }: StatsBarProps) {
  return (
    <Section style={{ borderBottom: "1px solid #E5E7EB" }}>
      <table role="presentation" width="100%" cellPadding="0" cellSpacing="0">
        <tbody>
          <tr>
            {stats.map((stat, i) => (
              <td
                key={i}
                width={`${Math.floor(100 / stats.length)}%`}
                style={{
                  textAlign: "center" as const,
                  padding: "18px 8px",
                  borderRight: i < stats.length - 1 ? "1px solid #E5E7EB" : undefined,
                }}
              >
                <Text
                  style={{
                    margin: "0",
                    fontSize: "28px",
                    fontWeight: "bold",
                    color: stat.color,
                    fontFamily: "Arial, Helvetica, sans-serif",
                  }}
                >
                  {stat.value}
                </Text>
                <Text
                  style={{
                    margin: "4px 0 0",
                    fontSize: "10px",
                    color: "#6B7280",
                    textTransform: "uppercase" as const,
                    letterSpacing: "1.5px",
                    fontFamily: "Arial, Helvetica, sans-serif",
                  }}
                >
                  {stat.label}
                </Text>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </Section>
  );
}
