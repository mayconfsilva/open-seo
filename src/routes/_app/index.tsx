import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { projectsQueryOptions } from "@/client/features/projects/projectQueries";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getErrorCode,
  UNEXPECTED_ERROR_MESSAGE,
} from "@/client/lib/error-messages";
import { AuthErrorCard } from "@/client/components/AuthErrorCard";
import { QueryError } from "@/client/components/QueryState";
import { StatusScreen } from "@/client/components/StatusScreen";
import { SUBSCRIBE_ROUTE } from "@/shared/billing";

export const Route = createFileRoute("/_app/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = useNavigate();

  // dataSEO: the agency starts on the portfolio (Carteira), which lists every
  // project. Wait for the project list so a hosted account without a
  // subscription still lands on billing below.
  const { data, error, isError, isFetching, refetch } = useQuery({
    ...projectsQueryOptions(),
    retry: false,
  });

  useEffect(() => {
    if (!data) return;
    void navigate({ to: "/projects", replace: true });
  }, [data, navigate]);

  useEffect(() => {
    if (getErrorCode(error) !== "PAYMENT_REQUIRED") {
      return;
    }

    void navigate({ href: SUBSCRIBE_ROUTE, replace: true });
  }, [error, navigate]);

  if (isError) {
    const errorCode = getErrorCode(error);

    if (errorCode === "PAYMENT_REQUIRED") {
      return (
        <StatusScreen
          pending
          description="Levando você para a cobrança para iniciar a assinatura."
        />
      );
    }

    return (
      <AuthErrorCard
        error={error}
        onRetry={() => void refetch()}
        fallback={
          <StatusScreen>
            <QueryError
              error={error}
              fallback={UNEXPECTED_ERROR_MESSAGE}
              onRetry={() => void refetch()}
              isRetrying={isFetching}
            />
          </StatusScreen>
        }
      />
    );
  }

  return <StatusScreen pending description="Abrindo a carteira…" />;
}
