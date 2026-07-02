import { useTranslation } from "react-i18next";

import { Heading, Text } from "@repo/ui";

import type { IndexProvisioningJob } from "../../../lib/api-client";
import { IndexProvisioningLogTimeline } from "./IndexProvisioningLogTimeline";

export function IndexProvisioningJobDetail({
  job,
}: {
  readonly job: IndexProvisioningJob;
}) {
  const { t } = useTranslation("common");

  return (
    <div className="space-y-4 text-sm">
      {job.errorMessage ? (
        <Text className="text-destructive whitespace-pre-wrap">
          {job.errorMessage}
        </Text>
      ) : null}

      <section className="space-y-2">
        <Heading level={3}>
          {t("indexProvisioning.processList.logTitle")}
        </Heading>
        <IndexProvisioningLogTimeline entries={job.log} />
      </section>
    </div>
  );
}
