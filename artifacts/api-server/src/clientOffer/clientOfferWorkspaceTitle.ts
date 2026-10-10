import type { OperatorDeliveryWorkspace } from "../deliveryWorkspace/operatorDeliveryWorkspaceTypes";

/** Return a source title only when explicitly present on the workspace. */
export function clientOfferTitleFromWorkspace(
  workspace: Pick<OperatorDeliveryWorkspace, "sourceRepository">,
): string {
  const title = workspace.sourceRepository.title?.trim();
  return title || "Proposta de entrega manual";
}
