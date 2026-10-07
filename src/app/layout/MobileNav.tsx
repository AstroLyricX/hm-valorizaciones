import { LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { NavLink, useLocation } from "react-router";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useSession } from "@/features/auth/useSession";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/shared/components/UserAvatar";

import { isNavItemActive, NAV_ITEMS, visiblePara } from "../navigation";

function TabContent({
	icon: Icon,
	label,
	isActive,
}: {
	icon: typeof Menu;
	label: string;
	isActive: boolean;
}) {
	return (
		<>
			<span
				className={cn(
					"flex h-8 w-14 items-center justify-center rounded-full transition-colors",
					isActive ? "bg-brand-50 text-brand-600" : "text-navy-400",
				)}
			>
				<Icon className="size-5" strokeWidth={isActive ? 2.25 : 1.75} aria-hidden="true" />
			</span>
			<span className={cn(isActive ? "font-medium text-brand-700" : "text-navy-500")}>{label}</span>
		</>
	);
}

const tabClass = "flex flex-1 flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 text-[11px]";

export function MobileNav() {
	const { pathname } = useLocation();
	const { user, signOut } = useSession();
	const [isMoreOpen, setIsMoreOpen] = useState(false);
	const barItems = NAV_ITEMS.filter((item) => item.mobile === "bar");
	const moreItems = NAV_ITEMS.filter(
		(item) => item.mobile === "more" && visiblePara(item, user?.rol),
	);
	const isMoreActive = moreItems.some((item) => isNavItemActive(item.to, pathname));

	return (
		<nav
			aria-label="Menú principal"
			className="fixed inset-x-0 bottom-0 z-40 border-t border-navy-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden dark:border-white/10 dark:bg-background/90"
		>
			<ul className="flex">
				{barItems.map(({ to, label, icon }) => (
					<li key={to} className="flex flex-1">
						<NavLink to={to} end={to === "/"} className={tabClass}>
							<TabContent icon={icon} label={label} isActive={isNavItemActive(to, pathname)} />
						</NavLink>
					</li>
				))}
				<li className="flex flex-1">
					<Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
						<SheetTrigger className={tabClass}>
							<TabContent icon={Menu} label="Más" isActive={isMoreActive} />
						</SheetTrigger>
						<SheetContent
							side="bottom"
							className="gap-2 rounded-t-2xl border-0 pb-[env(safe-area-inset-bottom)] shadow-2xl"
						>
							<div
								aria-hidden="true"
								className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-navy-200"
							/>
							<SheetHeader className="pb-2">
								<SheetTitle>Más opciones</SheetTitle>
							</SheetHeader>
							<ul className="flex flex-col gap-1 px-3">
								{moreItems.map(({ to, label, icon: Icon }) => {
									const isActive = isNavItemActive(to, pathname);

									return (
										<li key={to}>
											<NavLink
												to={to}
												onClick={() => setIsMoreOpen(false)}
												className={cn(
													"flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] transition-colors",
													isActive ? "bg-brand-50 font-medium text-brand-700" : "hover:bg-navy-50",
												)}
											>
												<span
													className={cn(
														"flex size-9 items-center justify-center rounded-lg",
														isActive ? "bg-white text-brand-600" : "bg-navy-50 text-navy-600",
													)}
												>
													<Icon className="size-[18px]" aria-hidden="true" />
												</span>
												{label}
											</NavLink>
										</li>
									);
								})}
							</ul>
							{user && (
								<div className="mx-3 mt-2 mb-4 flex items-center gap-3 rounded-2xl bg-navy-50 p-3 dark:bg-white/5">
									<UserAvatar user={user} />
									<div className="flex min-w-0 flex-1 flex-col leading-tight">
										<span className="truncate font-medium">{user.name}</span>
										<span className="truncate text-xs text-muted-foreground">{user.email}</span>
									</div>
									<Button
										variant="outline"
										size="sm"
										className="bg-white"
										onClick={() => void signOut()}
									>
										<LogOut />
										Salir
									</Button>
								</div>
							)}
						</SheetContent>
					</Sheet>
				</li>
			</ul>
		</nav>
	);
}
