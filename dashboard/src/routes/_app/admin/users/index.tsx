import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { PlusIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import {
  formatDate,
  RolePill,
  SearchInput,
  USER_ROLES,
  usePagedList,
} from "@/components/admin/admin-parts"
import { SectionCard } from "@/components/app/section-card"
import {
  Button,
  DataTable,
  EmptyState,
  FormDialog,
  Pagination,
  SelectField,
  TextField,
} from "@/components/app/ui-kit"
import { useApiMutation } from "@/lib/api-client"

export const Route = createFileRoute("/_app/admin/users/")({
  staticData: { crumb: { label: "Users", icon: "overview" } },
  head: () => ({ meta: [{ title: "Users · Administration · Halftone" }] }),
  component: AdminUsersPage,
})

interface AdminUser {
  id: string
  username: string
  role: string
  createdAt: string
  _count: { websites: number }
}

function AdminUsersPage() {
  const navigate = useNavigate()
  const { query, page, setPage, setSearch } =
    usePagedList<AdminUser>("/admin/users")
  const [creating, setCreating] = useState(false)
  const create = useApiMutation<{
    username: string
    password: string
    role: string
  }>("POST", "/users", ["/admin/users"])

  const { data } = query

  return (
    <SectionCard
      title="Users"
      description={
        data
          ? `${data.count} ${data.count === 1 ? "user" : "users"}`
          : undefined
      }
      actions={
        <>
          <SearchInput onChange={setSearch} placeholder="Search users …" />
          <Button variant="primary" onClick={() => setCreating(true)}>
            <PlusIcon /> New user
          </Button>
        </>
      }
    >
      <DataTable
        rows={data?.data}
        rowKey={(u) => u.id}
        isLoading={query.isLoading}
        error={query.error}
        onRowClick={(u) =>
          navigate({ to: "/admin/users/$userId", params: { userId: u.id } })
        }
        empty={
          <EmptyState
            title="No users found"
            description="Try a different search."
          />
        }
        columns={[
          {
            key: "username",
            header: "Username",
            cell: (u) => <span className="font-semibold">{u.username}</span>,
          },
          {
            key: "role",
            header: "Role",
            cell: (u) => <RolePill role={u.role} />,
          },
          {
            key: "websites",
            header: "Websites",
            align: "right",
            cell: (u) => u._count.websites,
          },
          {
            key: "created",
            header: "Created",
            cell: (u) => (
              <span className="text-muted-foreground">
                {formatDate(u.createdAt)}
              </span>
            ),
          },
        ]}
      />
      {data && (
        <Pagination
          page={page}
          pageSize={data.pageSize}
          count={data.count}
          onPage={setPage}
        />
      )}
      <FormDialog
        open={creating}
        onOpenChange={setCreating}
        title="New user"
        description="Create an account that can sign in to this instance."
        submitLabel="Create user"
        onSubmit={async (form) => {
          await create.mutateAsync({
            username: String(form.get("username")).trim(),
            password: String(form.get("password")),
            role: String(form.get("role")),
          })
          toast.success("User created")
        }}
      >
        <TextField
          name="username"
          label="Username"
          required
          maxLength={255}
          autoComplete="off"
        />
        <TextField
          name="password"
          type="password"
          label="Password"
          required
          minLength={8}
          maxLength={255}
          autoComplete="new-password"
          hint="At least 8 characters."
        />
        <SelectField
          name="role"
          label="Role"
          defaultValue="user"
          options={USER_ROLES}
        />
      </FormDialog>
    </SectionCard>
  )
}
