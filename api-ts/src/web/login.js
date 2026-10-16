const form = document.querySelector("#login-form");
form.addEventListener("submit", async (event) => {
	event.preventDefault();
	const button = form.querySelector("button");
	const error = document.querySelector("#login-error");
	error.textContent = "";
	button.disabled = true;
	button.textContent = "Entrando…";
	try {
		const response = await fetch("/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "same-origin",
			body: JSON.stringify(Object.fromEntries(new FormData(form))),
		});
		if (!response.ok)
			throw new Error(
				response.status === 401
					? "E-mail ou senha inválidos."
					: "Não foi possível entrar. Tente novamente.",
			);
		location.assign("/admin");
	} catch (failure) {
		error.textContent =
			failure.message === "Failed to fetch"
				? "Falha de conexão. Tente novamente."
				: failure.message;
	} finally {
		button.disabled = false;
		button.textContent = "Entrar no painel ↗";
	}
});
