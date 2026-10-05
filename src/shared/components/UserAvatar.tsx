import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { SessionUser } from "@/features/auth/SessionContext";

function initials(name: string): string {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part.charAt(0).toUpperCase())
		.join("");
}

export function UserAvatar({ user }: { user: SessionUser }) {
	return (
		<Avatar className="size-8 rounded-md">
			<AvatarFallback className="rounded-md bg-brand-600 text-xs font-medium text-white">
				{initials(user.name)}
			</AvatarFallback>
		</Avatar>
	);
}
