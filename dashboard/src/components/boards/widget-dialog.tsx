import { useState } from "react"
import {
  Button,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/app/ui-kit"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useEntityOptions } from "./entities"
import {
  ENTITY_LABELS,
  getBoardEntity,
  getBoardType,
  getComponentEntity,
  type Board,
  type BoardComponent,
  type EntityType,
} from "./model"
import { CATEGORIES, getWidget, isSupported, widgets } from "./registry"

/** Pick a widget type and configure it (entity, widget options, title). */
export function WidgetDialog({
  board,
  teamId,
  initial,
  onSave,
  onClose,
}: {
  board: Pick<Board, "type" | "parameters">
  teamId: string | null
  initial?: BoardComponent | null
  onSave: (component: BoardComponent) => void
  onClose: () => void
}) {
  const boardEntity = getBoardEntity(board)
  const mixed = getBoardType(board) === "mixed"
  const initialEntity = getComponentEntity(initial)

  const [type, setType] = useState(initial?.type ?? "WebsiteMetricsBar")
  const [entityType, setEntityType] = useState<EntityType>(
    initialEntity.entityType ?? boardEntity.entityType ?? "website"
  )
  const [entityId, setEntityId] = useState(initialEntity.entityId ?? "")
  const [props, setProps] = useState<Record<string, unknown>>(
    initial?.props ?? {}
  )
  const [title, setTitle] = useState(initial?.title ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")

  const effectiveEntityType = mixed ? entityType : boardEntity.entityType
  const widget = getWidget(type)
  const needsEntity = widget?.requiresEntity !== false
  const options = useEntityOptions(entityType, teamId, mixed && needsEntity)

  const choose = (next: string) => {
    const def = getWidget(next)!
    setType(next)
    setProps({ ...def.defaultProps })
  }

  const changeEntityType = (next: EntityType) => {
    setEntityType(next)
    setEntityId("")
    // Keep the widget valid for the new entity type.
    if (widget && !isSupported(widget, next)) choose("WebsiteMetricsBar")
  }

  const canSave = !!widget && (!mixed || !needsEntity || !!entityId)

  const save = () => {
    if (!widget) return
    const merged: Record<string, unknown> = { ...widget.defaultProps, ...props }
    // A select can show its first option while the stored value isn't valid for this entity type: store what's shown.
    for (const f of widget.fields ?? []) {
      const opts =
        (effectiveEntityType && f.optionsByEntity?.[effectiveEntityType]) ||
        f.options
      if (opts && !opts.some((o) => o.value === merged[f.name]))
        merged[f.name] = opts[0]?.value
    }
    const component: BoardComponent = { type, props: merged }
    if (title.trim()) component.title = title.trim()
    if (description.trim()) component.description = description.trim()
    if (mixed && needsEntity) {
      component.entityType = entityType
      component.entityId = entityId
    }
    onSave(component)
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit widget" : "Add widget"}</DialogTitle>
          <DialogDescription>
            Choose what to show and where the data comes from.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {CATEGORIES.map((cat) => {
            const items = widgets().filter(
              (w) =>
                w.category === cat.key && isSupported(w, effectiveEntityType)
            )
            if (!items.length) return null
            return (
              <div key={cat.key} className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {cat.name}
                </span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {items.map((w) => (
                    <button
                      key={w.type}
                      type="button"
                      onClick={() => choose(w.type)}
                      className={cn(
                        "flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors hover:bg-accent/40",
                        w.type === type && "border-foreground/40 bg-accent/60"
                      )}
                    >
                      <w.icon
                        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                        strokeWidth={1.75}
                      />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium">
                          {w.name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {w.description}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}

          {widget && (
            <div className="grid gap-3 border-t pt-4">
              {mixed && needsEntity && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <SelectField
                    label="Source type"
                    value={entityType}
                    onChange={(e) =>
                      changeEntityType(e.target.value as EntityType)
                    }
                    options={(Object.keys(ENTITY_LABELS) as EntityType[]).map(
                      (k) => ({ value: k, label: ENTITY_LABELS[k] })
                    )}
                  />
                  <SelectField
                    label={ENTITY_LABELS[entityType]}
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    options={[
                      {
                        value: "",
                        label: `Select ${ENTITY_LABELS[entityType].toLowerCase()}…`,
                      },
                      ...(options.data?.data ?? []).map((e) => ({
                        value: e.id,
                        label: e.name,
                      })),
                    ]}
                  />
                </div>
              )}
              {widget.fields?.map((f) => {
                const value = String(props[f.name] ?? f.defaultValue ?? "")
                if (f.type === "textarea") {
                  return (
                    <TextAreaField
                      key={f.name}
                      label={f.label}
                      value={value}
                      onChange={(e) =>
                        setProps({ ...props, [f.name]: e.target.value })
                      }
                    />
                  )
                }
                const opts =
                  (effectiveEntityType &&
                    f.optionsByEntity?.[effectiveEntityType]) ||
                  f.options ||
                  []
                return (
                  <SelectField
                    key={f.name}
                    label={f.label}
                    value={
                      opts.some((o) => o.value === value)
                        ? value
                        : (opts[0]?.value ?? "")
                    }
                    onChange={(e) =>
                      setProps({ ...props, [f.name]: e.target.value })
                    }
                    options={opts}
                  />
                )
              })}
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Optional"
                  maxLength={100}
                />
                <TextField
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional"
                  maxLength={200}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!canSave} onClick={save}>
            {initial ? "Apply" : "Add widget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
