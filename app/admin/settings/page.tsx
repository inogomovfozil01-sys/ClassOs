"use client";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/workspace";
import { ThemeSelect } from "@/components/providers/app-providers";
import { InstallPWAButton } from "@/components/pwa/install-banner";
import { useAuth } from "@/components/providers/auth-context";
import { canManageUsers } from "@/lib/auth/rbac";
export default function SettingsPage() {
  const { user } = useAuth();
  return (
    <AppShell title="Настройки">
      <PageHeader
        title="Настройки"
        description="Оформление и приложение на вашем устройстве."
      />
      {canManageUsers(user?.role) ? (
        <div className="max-w-md space-y-6">
          <ThemeSelect />
          <InstallPWAButton />
        </div>
      ) : (
        <p>Раздел доступен администратору.</p>
      )}
    </AppShell>
  );
}
