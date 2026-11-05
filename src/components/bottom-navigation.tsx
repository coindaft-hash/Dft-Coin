import { Link } from "@tanstack/react-router";
import { House, ChartNoAxesColumnIncreasing, CandlestickChart, Layers2, CircleUser } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BottomNavigation({ active = "Home" }: { active?: "Home" | "Markets" | "Trade" | "Positions" | "Profile" }) {
  const items = [{ name: "Home", label: "Home", icon: House, to: "/" as const }, { name: "Markets", label: "Markets", icon: ChartNoAxesColumnIncreasing, to: "/markets" as const }, { name: "Trade", label: "Trade", icon: CandlestickChart, to: "/trade" as const }, { name: "Positions", label: "Positions", icon: Layers2, to: "/positions" as const }, { name: "Profile", label: "Profile", icon: CircleUser, to: "/profile" as const }];
  return <nav className="bottom-nav" aria-label="Main navigation"><div className="bottom-nav-inner">{items.map(({ name, label, icon: Icon, to }) => {
    const content = <><span className={name === "Trade" ? "nav-trade-icon" : ""}><Icon strokeWidth={1.8}/></span><span>{label}</span></>;
    return <Button key={name} asChild variant="ghost" className="nav-item" data-active={name === active} title={name}><Link to={to} aria-current={name === active ? "page" : undefined}>{content}</Link></Button>;
  })}</div></nav>;
}
