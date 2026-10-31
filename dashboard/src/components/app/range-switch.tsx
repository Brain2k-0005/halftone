import { Segmented } from "@/components/app/section-card"
import { RANGES, type RangeKey } from "@/lib/range"

const options = (Object.keys(RANGES) as RangeKey[]).map((value) => ({
  value,
  label: RANGES[value].label,
}))

export function RangeSwitch({
  value,
  onChange,
}: {
  value: RangeKey
  onChange: (value: RangeKey) => void
}) {
  return <Segmented value={value} options={options} onChange={onChange} />
}
