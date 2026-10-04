import { useRegisterSW } from "virtual:pwa-register/react";

import { Button } from "@/components/ui/button";

export function ReloadPrompt() {
	const {
		needRefresh: [needRefresh, setNeedRefresh],
		offlineReady: [offlineReady, setOfflineReady],
		updateServiceWorker,
	} = useRegisterSW();

	if (!needRefresh && !offlineReady) {
		return null;
	}

	const close = () => {
		setNeedRefresh(false);
		setOfflineReady(false);
	};

	return (
		<div
			role="status"
			className="fixed inset-x-4 bottom-4 z-50 flex flex-col gap-3 rounded-lg border bg-card p-4 text-card-foreground shadow-lg sm:inset-x-auto sm:right-4 sm:w-96"
		>
			<p className="text-sm">
				{needRefresh
					? "Hay una nueva versión disponible."
					: "La aplicación está lista para usarse sin conexión."}
			</p>
			<div className="flex justify-end gap-2">
				{needRefresh && (
					<Button size="sm" onClick={() => void updateServiceWorker()}>
						Actualizar
					</Button>
				)}
				<Button size="sm" variant="outline" onClick={close}>
					Cerrar
				</Button>
			</div>
		</div>
	);
}
