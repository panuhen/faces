import { Compare } from './screens/Compare'
import { Gallery } from './screens/Gallery'

export function App() {
  const params = new URLSearchParams(window.location.search)
  const c = params.get('c')
  if (c) return <Gallery character={c} />
  return <Compare />
}
