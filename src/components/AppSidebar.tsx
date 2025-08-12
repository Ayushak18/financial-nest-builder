import { useState } from "react";
import {
  Home,
  Target,
  Settings,
  Plus,
  BarChart3,
  PieChart,
  Download,
  Building2,
  TrendingUp,
  Wallet,
  CreditCard,
  Goal,
  Repeat,
  Bell,
  Calendar,
  LineChart,
  Calculator,
  List
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

export type SidebarSection = 
  | "overview"
  | "budget-setup"
  | "categories"
  | "transactions"
  | "insights"
  | "accounts"
  | "investments"
  | "net-worth"
  | "debt"
  | "goals"
  | "recurring"
  | "bills"
  | "trends"
  | "forecast"
  | "export";

interface AppSidebarProps {
  activeSection: SidebarSection;
  onSectionChange: (section: SidebarSection) => void;
}

const budgetItems = [
  { title: "Overview", section: "overview" as const, icon: Home },
  { title: "Budget Setup", section: "budget-setup" as const, icon: Settings },
  { title: "Categories", section: "categories" as const, icon: Target },
  { title: "Transactions", section: "transactions" as const, icon: List },
  { title: "Insights", section: "insights" as const, icon: BarChart3 },
];

const financialItems = [
  { title: "Accounts", section: "accounts" as const, icon: Building2 },
  { title: "Investments", section: "investments" as const, icon: TrendingUp },
  { title: "Net Worth", section: "net-worth" as const, icon: Wallet },
  { title: "Debt", section: "debt" as const, icon: CreditCard },
  { title: "Goals", section: "goals" as const, icon: Goal },
];

const automationItems = [
  { title: "Recurring", section: "recurring" as const, icon: Repeat },
  { title: "Bills", section: "bills" as const, icon: Calendar },
];

const analyticsItems = [
  { title: "Trends", section: "trends" as const, icon: LineChart },
  { title: "Forecast", section: "forecast" as const, icon: Calculator },
];

const utilityItems = [
  { title: "Export Data", section: "export" as const, icon: Download },
];

export function AppSidebar({ activeSection, onSectionChange }: AppSidebarProps) {
  const { state } = useSidebar();

  const isActive = (section: SidebarSection) => activeSection === section;

  const getButtonClass = (section: SidebarSection) =>
    isActive(section)
      ? "bg-primary/10 text-primary font-medium border-r-2 border-primary"
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground";

  const renderMenuGroup = (items: Array<{ title: string; section: SidebarSection; icon: any }>, label: string) => (
    <SidebarGroup>
      <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.section}>
              <SidebarMenuButton
                onClick={() => onSectionChange(item.section)}
                className={getButtonClass(item.section)}
              >
                <item.icon className="h-4 w-4" />
                {state !== "collapsed" && <span className="text-sm">{item.title}</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar className={state === "collapsed" ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent className="py-4">
        {renderMenuGroup(budgetItems, "Budget")}
        {renderMenuGroup(financialItems, "Financial")}
        {renderMenuGroup(automationItems, "Automation")}
        {renderMenuGroup(analyticsItems, "Analytics")}
        {renderMenuGroup(utilityItems, "Tools")}
      </SidebarContent>
    </Sidebar>
  );
}