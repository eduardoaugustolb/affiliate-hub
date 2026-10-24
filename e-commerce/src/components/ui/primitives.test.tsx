import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { Select } from "./select";

test("custom checkbox exposes its state and submits only selected options", () => {
  const checked = renderToStaticMarkup(
    <Checkbox label="Azul" name="optionIds" value="blue" checked />,
  );
  expect(checked).toContain('role="checkbox"');
  expect(checked).toContain('aria-checked="true"');
  expect(checked).toContain('type="hidden" name="optionIds"');
  expect(checked).not.toContain('type="checkbox"');
  const unchecked = renderToStaticMarkup(
    <Checkbox label="Azul" name="optionIds" value="blue" checked={false} />,
  );
  expect(unchecked).toContain('aria-checked="false"');
  expect(unchecked).not.toContain('type="hidden"');
  const disabled = renderToStaticMarkup(
    <Checkbox label="Azul" name="optionIds" value="blue" checked disabled />,
  );
  expect(disabled.match(/disabled=""/g)).toHaveLength(2);
});
test("select uses the app combobox and propagates disabled state to form values", () => {
  const html = renderToStaticMarkup(
    <Select
      label="Marketplace"
      name="marketplace"
      options={[{ value: "shein", label: "Shein" }]}
      value="shein"
      onChange={() => {}}
      disabled
    />,
  );
  expect(html).toContain('role="combobox"');
  expect(html).toContain('aria-disabled="true"');
  expect(html).toContain('tabindex="-1"');
  expect(html).not.toContain("<select");
  expect(html).toContain('name="marketplace"');
});
test("app button defaults to a non-submit action and preserves explicit submission", () => {
  expect(renderToStaticMarkup(<Button>Cancelar</Button>)).toContain(
    'type="button"',
  );
  expect(
    renderToStaticMarkup(
      <Button type="submit" disabled>
        Salvar
      </Button>,
    ),
  ).toContain('type="submit"');
});
