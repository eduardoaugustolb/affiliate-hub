const $ = (selector) => document.querySelector(selector);
const pageSize = 25;
let offset = 0;
let editing = null;
let busy = false;
const messages = {
	PRODUCT_NOT_FOUND: "Produto não encontrado. Atualize a lista.",
	DOMAIN_ERROR: "Confira o nome, os links, a plataforma e o status.",
	BAD_REQUEST: "Confira os campos do formulário.",
	FORBIDDEN_OPERATION: "Você não tem permissão para esta ação.",
};
async function api(path, method = "GET", body) {
	const response = await fetch(path, {
		method,
		credentials: "same-origin",
		headers: { "Content-Type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
	if (response.status === 401) {
		location.assign("/admin/login");
		throw new Error("Sua sessão expirou. Entre novamente.");
	}
	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		throw new Error(
			messages[error.code] ?? "Não foi possível concluir. Tente novamente.",
		);
	}
	return response.status === 204 ? undefined : response.json();
}
function feedback(message, error = false) {
	$("#feedback").textContent = message;
	$("#feedback").className = error ? "error" : "success";
}
function button(text, action) {
	const element = document.createElement("button");
	element.type = "button";
	element.className = "secondary";
	element.textContent = text;
	element.addEventListener("click", action);
	return element;
}
async function copy(code, target) {
	try {
		await navigator.clipboard.writeText(code);
		if (target) target.textContent = "Código copiado.";
		else feedback(`Código copiado: ${code}`);
	} catch {
		if (target) target.textContent = "Copie o código exibido acima.";
		else feedback(`Não foi possível copiar automaticamente. Código: ${code}`);
	}
}
function preview() {
	const image = $("#preview");
	$("#preview-error").hidden = true;
	try {
		const url = new URL($("#imageUrl").value);
		if (url.protocol !== "https:") throw new Error();
		image.src = url.href;
		image.hidden = false;
	} catch {
		image.removeAttribute("src");
		image.hidden = true;
	}
}
$("#preview").addEventListener("error", () => {
	$("#preview").hidden = true;
	$("#preview-error").hidden = false;
});
$("#imageUrl").addEventListener("input", preview);
function edit(product = null) {
	editing = product;
	$("#product-form").reset();
	$("#form-error").textContent = "";
	$("#editor-title").textContent = product ? "Editar produto" : "Novo produto";
	$("#editing-code").textContent = product
		? `Código permanente: ${product.code}`
		: "O código será gerado ao salvar.";
	if (product)
		for (const field of [
			"name",
			"marketplace",
			"status",
			"destinationUrl",
			"imageUrl",
		])
			$(`#${field}`).value = product[field];
	preview();
	$("#editor").showModal();
	$("#name").focus();
}
async function changeStatus(product) {
	if (busy) return;
	busy = true;
	try {
		await api(`/products/${product.code}`, "PUT", {
			...product,
			status: product.status === "active" ? "inactive" : "active",
		});
		await load();
		feedback(
			product.status === "active"
				? "Produto desativado. O código continua reservado."
				: "Produto ativado.",
		);
	} catch (error) {
		feedback(error.message, true);
	} finally {
		busy = false;
	}
}
function render(product) {
	const row = document.createElement("article");
	row.className = "product-row";
	const image = document.createElement("img");
	image.src = product.imageUrl;
	image.alt = "";
	image.loading = "lazy";
	image.referrerPolicy = "no-referrer";
	image.addEventListener("error", () => image.removeAttribute("src"), {
		once: true,
	});
	const info = document.createElement("div");
	info.className = "product-info";
	const name = document.createElement("h3");
	name.textContent = product.name;
	const code = document.createElement("a");
	code.className = "product-code";
	code.textContent = product.code;
	code.href = `/${product.code}`;
	code.target = "_blank";
	code.rel = "noopener";
	code.setAttribute("aria-label", `Abrir produto ${product.code}`);
	const meta = document.createElement("p");
	meta.textContent =
		(product.marketplace === "shein" ? "SHEIN" : "Shopee") +
		" · " +
		(product.status === "active" ? "Ativo" : "Inativo");
	meta.className = product.status === "active" ? "status-active" : "muted";
	info.append(name, code, meta);
	const actions = document.createElement("div");
	actions.className = "row-actions";
	actions.append(
		button("Copiar código", () => copy(product.code)),
		button("Editar", () => edit(product)),
		button(product.status === "active" ? "Desativar" : "Ativar", () =>
			changeStatus(product),
		),
	);
	row.append(image, info, actions);
	$("#products").append(row);
}
async function load() {
	$("#loading").hidden = false;
	$("#previous").disabled = true;
	$("#next").disabled = true;
	try {
		let products = await api(
			`/products?limit=${pageSize + 1}&offset=${offset}`,
		);
		if (products.length === 0 && offset > 0) {
			offset = Math.max(0, offset - pageSize);
			products = await api(`/products?limit=${pageSize + 1}&offset=${offset}`);
		}
		$("#products").replaceChildren();
		$("#empty").hidden = products.length !== 0;
		products.slice(0, pageSize).forEach(render);
		$("#page-label").textContent = `Página ${offset / pageSize + 1}`;
		$("#previous").disabled = offset === 0;
		$("#next").disabled = products.length <= pageSize;
	} catch (error) {
		feedback(error.message, true);
	} finally {
		$("#loading").hidden = true;
	}
}
$("#product-form").addEventListener("submit", async (event) => {
	event.preventDefault();
	if (busy) return;
	busy = true;
	$("#save-product").disabled = true;
	$("#form-error").textContent = "";
	try {
		const body = Object.fromEntries(new FormData(event.currentTarget));
		const result = await api(
			editing ? `/products/${editing.code}` : "/products",
			editing ? "PUT" : "POST",
			body,
		);
		$("#editor").close();
		offset = 0;
		await load();
		if (!editing) {
			$("#created-code").textContent = result.code;
			$("#copy-feedback").textContent = "";
			$("#created").showModal();
		} else feedback("Produto atualizado. O código foi preservado.");
	} catch (error) {
		$("#form-error").textContent = error.message;
	} finally {
		busy = false;
		$("#save-product").disabled = false;
	}
});
$("#new-product").addEventListener("click", () => edit());
$("#close-editor").addEventListener("click", () => $("#editor").close());
$("#close-created").addEventListener("click", () => $("#created").close());
$("#copy-created").addEventListener("click", () =>
	copy($("#created-code").textContent, $("#copy-feedback")),
);
$("#previous").addEventListener("click", () => {
	offset = Math.max(0, offset - pageSize);
	load();
});
$("#next").addEventListener("click", () => {
	offset += pageSize;
	load();
});
$("#logout").addEventListener("click", async () => {
	try {
		await api("/auth/logout", "POST");
		location.assign("/admin/login");
	} catch (error) {
		feedback(error.message, true);
	}
});
load();
