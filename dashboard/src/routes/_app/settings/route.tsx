import { createFileRoute, Link, Outlet } from "@tanstack/react-router"
import { SETTINGS_NAV } from "@/components/app/nav"
import { AREA_TAB, AreaTabs, PageHeader } from "@/components/app/ui-kit"

export const Route = createFileRoute("/_app/settings")({
  staticData: { crumb: { label: "Settings", icon: "overview" } },
  component: SettingsLayout,
})

function SettingsLayout() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Settings"
        description="Your account, preferences and teams."
      />
      <AreaTabs>
        {SETTINGS_NAV.map((item) => (
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
