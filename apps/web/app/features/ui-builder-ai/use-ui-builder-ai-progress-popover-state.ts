import { useEffect, useState } from "react";

export function useUiBuilderAiProgressPopoverState(isWorking: boolean) {
  const [progressDismissed, setProgressDismissed] = useState(false);
  const [progressHoverOpen, setProgressHoverOpen] = useState(false);

  useEffect(() => {
    if (isWorking) {
      setProgressDismissed(false);
      setProgressHoverOpen(false);
    } else {
      setProgressDismissed(false);
      setProgressHoverOpen(false);
    }
  }, [isWorking]);

  const progressOpen = isWorking && (!progressDismissed || progressHoverOpen);

  const onProgressOpenChange = (open: boolean) => {
    if (!open) {
      setProgressDismissed(true);
      setProgressHoverOpen(false);
    }
  };

  return {
    progressOpen,
    onProgressOpenChange,
    onProgressHoverOpenChange: setProgressHoverOpen,
  };
}
