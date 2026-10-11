// Stand-in until the project pane (ProjectPage.tsx) lands; the merge switches the import in App.tsx.
import type { ReactNode } from "react"
import { ProjectPage } from "./ProjectPage"

export function ProjectPane(props: { id: string; layout: "pane" | "page" | "phone" }): ReactNode {
  if (props.layout === "page") return <ProjectPage id={props.id} />
  return <div className="text-muted-foreground p-4 text-sm">Project pane ({props.layout})</div>
}
