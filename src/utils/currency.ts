import getSymbolFromCurrency from 'currency-symbol-map'

export default async function getLocalCurrency(): string {
  const cSymbol = await (await fetch("https://ipapi.co/currency/")).text()
  return getSymbolFromCurrency(cSymbol)
}
