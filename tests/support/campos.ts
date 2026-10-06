import { screen } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";

type Usuario = ReturnType<typeof userEvent.setup>;

// Los selectores son propios (no el <select> del navegador): se abren y se elige la opción.
export async function seleccionar(
	user: Usuario,
	selector: HTMLElement,
	opcion: string | RegExp,
): Promise<void> {
	await user.click(selector);
	await user.click(await screen.findByRole("option", { name: opcion }));
}

// El calendario se abre desde el campo; se elige mes y año, y luego el día.
export async function elegirFecha(user: Usuario, campo: HTMLElement, iso: string): Promise<void> {
	const [anio, mes, dia] = iso.split("-").map(Number);
	const nombreMes = new Date(anio, mes - 1, 1).toLocaleDateString("es-PE", { month: "long" });
	await user.click(campo);
	await user.selectOptions(
		await screen.findByRole("combobox", { name: "Elegir el año" }),
		`${anio}`,
	);
	await user.selectOptions(screen.getByRole("combobox", { name: "Elegir el mes" }), `${mes - 1}`);
	await user.click(
		screen.getByRole("button", { name: new RegExp(`, ${dia} de ${nombreMes} de ${anio}$`, "i") }),
	);
}
