return {
  "neovim/nvim-lspconfig",
  opts = {
    servers = {
      -- typescript-tools replaces tsserver and is more powerful
      ["typescript-tools"] = {
        -- settings for typescript-tools
        -- these are just examples, you can find more in the docs
        settings = {
          -- complete functions with their signature
          complete_function_calls = true,
          -- enable inlay hints
          inlay_hints = {
            enabled = true,
          },
        },
      },
      -- tailwindcss for tailwind support
      tailwindcss = {},
      -- emmet for html/jsx support
      emmet_ls = {},
      -- jsonls for json support
      jsonls = {},
      -- marksman for markdown support
      marksman = {},
    },
  },
}
