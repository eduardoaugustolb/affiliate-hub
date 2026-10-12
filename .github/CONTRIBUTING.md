# Contributing

Affiliate Hub is a small project focused on getting people from a product code in a social post to the corresponding product link. Keep changes tied to that flow and its operational needs.

## Before opening a pull request

1. Open an issue first for larger changes so the scope can be discussed.
2. Keep pull requests focused and describe the behavior that changes.
3. Add or update tests when changing domain or application behavior.
4. Run the relevant checks from `api-ts/`:

   ```bash
   bun run check
   bun test
   ```

5. Use Conventional Commit messages, for example `feat(api): resolve product codes` or `fix(domain): reject invalid codes`.

Do not include credentials, production data, or real affiliate links containing private tracking information in commits or issue reports.

Do not submit code or other material unless you have the right to contribute it. A pull request alone does not grant permission to use or distribute your contribution. Before accepting an external contribution, the maintainer must agree with the contributor in writing on the rights needed to use, modify, and distribute that contribution as part of this proprietary project. No CLA or contribution agreement has been set up yet.
