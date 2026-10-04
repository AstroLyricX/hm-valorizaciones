// Arco del logo H&M, usado como elemento decorativo.
export function BrandArc({ className }: { className?: string }) {
	return (
		<svg viewBox="6 6 52 31" aria-hidden="true" className={className}>
			<defs>
				<linearGradient id="brand-arc" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0" stopColor="currentColor" stopOpacity=".55" />
					<stop offset=".6" stopColor="currentColor" />
				</linearGradient>
			</defs>
			<path
				fill="url(#brand-arc)"
				d="M6.5 37C9.5 19.5 20 7 33.5 7C45.5 7 54.5 17.5 57.5 36.5L47 36.5C45 25.5 40.5 17.5 34 17.5C25 17.5 16 25.5 11.5 37Z"
			/>
		</svg>
	);
}
