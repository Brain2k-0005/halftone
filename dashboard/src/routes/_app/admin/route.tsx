import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router"
import { AREA_TAB, AreaTabs, PageHeader } from "@/components/app/ui-kit"
import { ADMIN_NAV } from "@/components/app/nav"

export const Route = createFileRoute("/_app/admin")({
  beforeLoad: ({ context }) => {
    if (!context.user.isAdmin) throw redirect({ to: "/" })
  },
  staticData: { crumb: { label: "Administration", icon: "overview" } },
  head: () => ({ meta: [{ title: "Administration · Umami" }] }),
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Administration"
        description="Users, teams, websites and security of this Umami instance"
      />
      <AreaTabs>
        {ADMIN_NAV.map((item) => (
          <Link key={item.to} to={item.to} className={AREA_TAB}>
            <item.icon className="size-4" strokeWidth={1.75} />
            {item.label}
          </Link>
        ))}
      </AreaTabs>
      <Outlet />
    </div>
  )
}
