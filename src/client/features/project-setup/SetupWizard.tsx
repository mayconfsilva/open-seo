import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { QueryState } from "@/client/components/QueryState";
import { setLastProjectId } from "@/client/lib/active-project";
import { FirstCheck } from "./FirstCheck";
import { SetupProgress, useSetup } from "./setupShared";
import { StepBusiness } from "./StepBusiness";
import { StepCompetitors } from "./StepCompetitors";
import { StepKeywords } from "./StepKeywords";
import { StepMarket } from "./StepMarket";
import { StepReview } from "./StepReview";
import { StepSources } from "./StepSources";

type SetupStep = number | "first-check";

/**
 * The new-project wizard (boards 5a–5g). Step 1 creates a draft project;
 * every later step saves to it, so the wizard can be left and resumed.
 */
export function SetupWizard({
  projectId,
  step,
}: {
  projectId: string | undefined;
  step: SetupStep;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const go = (next: SetupStep, id = projectId) =>
    void navigate({
      to: "/new-project",
      search: { project: id, step: next },
    });

  useEffect(() => {
    if (projectId) setLastProjectId(projectId);
  }, [projectId]);

  return (
    <div className="h-full overflow-auto px-4 py-6 pb-24 md:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        {step === "first-check" ? null : <SetupProgress step={step} />}
        {projectId ? (
          <DraftSteps
            projectId={projectId}
            step={step}
            go={go}
            onCancel={() => void navigate({ to: "/projects" })}
          />
        ) : (
          <StepBusiness
            setup={null}
            onCancel={() => void navigate({ to: "/projects" })}
            onSaved={(id) => {
              void queryClient.invalidateQueries({ queryKey: ["projects"] });
              go(2, id);
            }}
          />
        )}
      </div>
    </div>
  );
}

function DraftSteps({
  projectId,
  step,
  go,
  onCancel,
}: {
  projectId: string;
  step: SetupStep;
  go: (step: SetupStep) => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const setupQuery = useSetup(projectId);
  return (
    <QueryState query={setupQuery} errorFallback="Não foi possível abrir">
      {(setup) => {
        switch (step) {
          case 1:
            return (
              <StepBusiness
                setup={setup}
                onCancel={onCancel}
                onSaved={() => {
                  void queryClient.invalidateQueries({
                    queryKey: ["projects"],
                  });
                  go(2);
                }}
              />
            );
          case 2:
            return (
              <StepMarket
                setup={setup}
                onBack={() => go(1)}
                onSaved={() => go(3)}
              />
            );
          case 3:
            return (
              <StepSources
                setup={setup}
                onBack={() => go(2)}
                onNext={() => go(4)}
              />
            );
          case 4:
            return (
              <StepKeywords
                setup={setup}
                onBack={() => go(3)}
                onNext={() => go(5)}
              />
            );
          case 5:
            return (
              <StepCompetitors
                setup={setup}
                onBack={() => go(4)}
                onNext={() => go(6)}
              />
            );
          case 6:
            return (
              <StepReview
                setup={setup}
                onBack={() => go(5)}
                onEdit={(target) => go(target)}
                onConfirmed={() => {
                  void queryClient.invalidateQueries({
                    queryKey: ["projects"],
                  });
                  go("first-check");
                }}
              />
            );
          case "first-check":
            return <FirstCheck setup={setup} />;
          default:
            return null;
        }
      }}
    </QueryState>
  );
}
