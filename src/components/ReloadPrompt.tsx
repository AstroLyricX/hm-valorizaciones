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
			className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 flex flex-col gap-3 rounded-xl border border-navy-100 bg-white p-4 text-navy-900 shadow-lg md:inset-x-auto md:right-6 md:bottom-6 md:w-96"
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
