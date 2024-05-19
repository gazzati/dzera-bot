import moduleAlias from "module-alias"

moduleAlias.addAliases({
  "@root": `${__dirname}/`,
  "@database": `${__dirname}/database/`,
  "@interfaces": `${__dirname}/interfaces/`,
  "@bots": `${__dirname}/bots/`,
  "@helpers": `${__dirname}/helpers/`,
  "@services": `${__dirname}/services/`
})
