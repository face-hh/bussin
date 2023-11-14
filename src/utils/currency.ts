import getSymbolFromCurrency from 'currency-symbol-map'
import axios from 'axios';

export default async function getLocalCurrency(): string {
  const cSymbol = await axios.get("https://ipapi.co/currency/")
  return getSymbolFromCurrency(cSymbol)
}
