import {
  BarChart3,
  Globe,
  HeartPulse,
  MessageSquare,
  Network,
  UsersRound,
} from "lucide-react";

export const navItems = [
  { href: "/", label: "Overview", icon: BarChart3 },
  { href: "/market", label: "Market Position", icon: Globe },
  { href: "/client-health", label: "Client Health", icon: HeartPulse },
  { href: "/allocation", label: "Allocation", icon: UsersRound },
  { href: "/chat", label: "AI Chat", icon: MessageSquare },
  { href: "/architecture", label: "Architecture", icon: Network },
];
