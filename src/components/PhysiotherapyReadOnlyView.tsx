import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";
import type { PhysiotherapyPrescriptionData } from "../data/physiotherapy";
import { themeColors } from "../theme/colors";

interface PhysiotherapyReadOnlyViewProps {
  data: PhysiotherapyPrescriptionData;
  meta?: {
    displayId?: string;
    status?: string;
    issuedAt?: string;
  };
}

function selectedItems(
  values: Array<{ selected: boolean; displayValue: string }> | undefined,
) {
  return (values ?? [])
    .filter((item) => item.selected)
    .map((item) => item.displayValue);
}

function textOrDash(value?: string | number) {
  if (value === undefined || value === null) {
    return "-";
  }

  if (typeof value === "string" && !value.trim()) {
    return "-";
  }

  return `${value}`;
}

function normalizeStatus(value?: string) {
  const normalized = (value || "").trim().toLowerCase();
  return normalized === "final" || normalized === "finalized"
    ? "FINALIZED"
    : "DRAFT";
}

function formatIssuedAt(value?: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const day = date.getDate();
  const suffix =
    day >= 11 && day <= 13
      ? "th"
      : day % 10 === 1
        ? "st"
        : day % 10 === 2
          ? "nd"
          : day % 10 === 3
            ? "rd"
            : "th";
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const year = date.getFullYear();
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${day}${suffix} ${month} ${year}, ${time}`;
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function KV({ label, value }: { label: string; value?: string | number }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.subLabel}>{label}</Text>
      <Text style={styles.bodyText}>{textOrDash(value)}</Text>
    </View>
  );
}

export function PhysiotherapyReadOnlyView({
  data,
  meta,
}: PhysiotherapyReadOnlyViewProps) {
  const medicalHistory = selectedItems(data.medicalHistoryConditions);
  const painTypes = selectedItems(data.painTypes);
  const treatmentMethods = selectedItems(data.treatmentMethods);
  const status = normalizeStatus(meta?.status);

  return (
    <View style={styles.contentRoot}>
      <SectionCard title={meta?.displayId || "-"}>
        <View style={styles.prescriptionRow}>
          <Text style={styles.issuedText}>
            Issued {formatIssuedAt(meta?.issuedAt)}
          </Text>
          <View
            style={[
              styles.statusPill,
              status === "FINALIZED"
                ? styles.statusPillFinalized
                : styles.statusPillDraft,
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                status === "FINALIZED"
                  ? styles.statusPillTextFinalized
                  : styles.statusPillTextDraft,
              ]}
            >
              {status}
            </Text>
          </View>
        </View>
      </SectionCard>
      <SectionCard title="Complaint and Medical History">
        {meta?.displayId ? (
          <KV label="Prescription" value={meta.displayId} />
        ) : null}
        <KV label="Issued" value={formatIssuedAt(meta?.issuedAt)} />
        <KV label="Chief Complaint" value={data.complaint} />
        <KV label="Medical History Notes" value={data.medicalHistoryNotes} />
        <KV label="Surgery Details" value={data.surgeryDetails} />

        <View style={styles.blockWrap}>
          <Text style={styles.subLabel}>Medical History Conditions</Text>
          {medicalHistory.length > 0 ? (
            <View style={styles.chipRow}>
              {medicalHistory.map((item) => (
                <View key={item} style={styles.chip}>
                  <Text style={styles.chipText}>{item}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.bodyText}>-</Text>
          )}
        </View>
      </SectionCard>

      <SectionCard title="Assessment">
        <KV label="Pain Level" value={`${data.painLevel ?? 0} / 10`} />
        <KV label="Pain Notes" value={data.painTypeNotes} />
        <KV label="Pain Level Notes" value={data.painLevelNotes} />
        <KV label="Range Of Motion" value={data.rangeOfMotion} />
        <KV label="Muscle Strength" value={data.muscleStrength} />
        <KV label="Muscle Tightness" value={data.muscleTightness} />
        <KV label="Special Tests" value={data.specialTests} />

        <View style={styles.blockWrap}>
          <Text style={styles.subLabel}>Pain Types</Text>
          {painTypes.length > 0 ? (
            <View style={styles.chipRow}>
              {painTypes.map((item) => (
                <View key={item} style={styles.chip}>
                  <Text style={styles.chipText}>{item}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.bodyText}>-</Text>
          )}
        </View>
      </SectionCard>

      <SectionCard title="Prescribed Treatment">
        <KV label="Treatment Plan" value={data.treatmentPlan} />
        <KV label="Suggested Sessions" value={data.suggestedSessions} />
        <KV label="Short Term Goals" value={data.shortTermTreatmentGoals} />
        <KV label="Long Term Goals" value={data.longTermTreatmentGoals} />
        <KV label="Do's and Don'ts" value={data.dosDonts} />

        <View style={styles.blockWrap}>
          <Text style={styles.subLabel}>Treatment Methods</Text>
          {treatmentMethods.length > 0 ? (
            <View style={styles.chipRow}>
              {treatmentMethods.map((item) => (
                <View key={item} style={styles.chip}>
                  <Text style={styles.chipText}>{item}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.bodyText}>-</Text>
          )}
        </View>
      </SectionCard>
    </View>
  );
}

const styles = {
  contentRoot: {
    gap: 10,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6E1D8",
    backgroundColor: themeColors.surface,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
  },
  sectionTitle: {
    color: themeColors.textPrimary,
    fontSize: 16,
    fontWeight: "800" as const,
    letterSpacing: 0.2,
  },
  kvRow: {
    gap: 2,
    marginTop: 2,
  },
  subLabel: {
    color: themeColors.textSecondary,
    fontSize: 12,
    fontWeight: "700" as const,
  },
  bodyText: {
    color: themeColors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500" as const,
  },
  blockWrap: {
    marginTop: 8,
    gap: 6,
  },
  chipRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 6,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#F2F4F5",
    borderWidth: 1,
    borderColor: "#DDE3E5",
  },
  chipText: {
    color: themeColors.textPrimary,
    fontSize: 12,
    fontWeight: "600" as const,
  },
  prescriptionRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: 10,
  },
  issuedText: {
    color: themeColors.textSecondary,
    fontSize: 12,
    fontWeight: "600" as const,
    flex: 1,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillFinalized: {
    backgroundColor: "#DFF7F4",
  },
  statusPillDraft: {
    backgroundColor: "#FFF0E4",
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800" as const,
    letterSpacing: 0.5,
  },
  statusPillTextFinalized: {
    color: "#06A6A6",
  },
  statusPillTextDraft: {
    color: "#CC6F15",
  },
};
