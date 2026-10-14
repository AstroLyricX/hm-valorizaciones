import { ChevronsUpDown, LogOut } from "lucide-react";
import { NavLink, useLocation } from "react-router";

import { ruta } from "@/app/entorno";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/components/ui/sidebar";
import { useSession } from "@/features/auth/useSession";
import { UserAvatar } from "@/shared/components/UserAvatar";

import { isNavItemActive, NAV_GROUPS, visiblePara } from "../navigation";

const itemClass =
	"h-9 gap-3 rounded-md px-2.5 text-[14px] text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white data-active:bg-brand-600 data-active:font-medium data-active:text-white data-active:shadow-sm data-active:shadow-black/20 [&_svg]:size-[18px] [&_svg]:text-white/45 data-active:[&_svg]:text-white";

export function AppSidebar() {
	const { pathname } = useLocation();
	const { user, signOut } = useSession();

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader className="h-16 justify-center border-b border-sidebar-border px-3">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							size="lg"
							className="gap-2.5 hover:bg-transparent active:bg-transparent"
							render={<NavLink to="/" />}
						>
							<img
								src={ruta("favicon.svg")}
								alt=""
								width={32}
								height={32}
								className="size-8 shrink-0 rounded-lg ring-1 ring-white/15"
							/>
							<span className="flex flex-col leading-tight">
								<span className="font-semibold tracking-tight text-white">Valorizaciones</span>
								<span className="text-xs text-white/50">H&amp;M E.I.R.L.</span>
							</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent className="px-1 pt-2">
				{NAV_GROUPS.map((group) => ({
					...group,
					items: group.items.filter((item) => visiblePara(item, user?.rol)),
				}))
					.filter((group) => group.items.length > 0)
					.map((group) => (
						<SidebarGroup key={group.label}>
							<SidebarGroupLabel className="text-xs font-medium text-white/40">
								{group.label}
							</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu className="gap-0.5">
									{group.items.map(({ to, label, icon: Icon }) => (
										<SidebarMenuItem key={to}>
											<SidebarMenuButton
												tooltip={label}
												isActive={isNavItemActive(to, pathname)}
												className={itemClass}
												render={<NavLink to={to} end={to === "/"} />}
											>
												<Icon />
												<span>{label}</span>
											</SidebarMenuButton>
										</SidebarMenuItem>
									))}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					))}
			</SidebarContent>

			{user && (
				<SidebarFooter className="border-t border-sidebar-border p-2">
					<SidebarMenu>
						<SidebarMenuItem>
							<DropdownMenu>
								<DropdownMenuTrigger
									render={
										<SidebarMenuButton
											size="lg"
											className="rounded-md px-2 hover:bg-white/[0.06] data-popup-open:bg-white/10"
										/>
									}
								>
									<UserAvatar user={user} />
									<span className="flex min-w-0 flex-col leading-tight">
										<span className="truncate font-medium text-white">{user.name}</span>
										<span className="truncate text-xs text-white/50">{user.email}</span>
									</span>
									<ChevronsUpDown className="ml-auto text-white/40" />
								</DropdownMenuTrigger>
								<DropdownMenuContent side="right" align="end" className="min-w-56">
									{/* Base UI exige que la etiqueta esté dentro de un grupo. */}
									<DropdownMenuGroup>
										<DropdownMenuLabel className="flex flex-col gap-0.5">
											<span className="truncate">{user.email}</span>
											<span className="font-normal">
												{user.rol === "ADMIN" ? "Administrador" : "Operador"}
											</span>
										</DropdownMenuLabel>
									</DropdownMenuGroup>
									<DropdownMenuSeparator />
									<DropdownMenuItem onClick={() => void signOut()}>
										<LogOut />
										Cerrar sesión
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarFooter>
			)}
			<SidebarRail />
		</Sidebar>
	);
}
