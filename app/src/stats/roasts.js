// Rule-based roast engine: deterministic template selection from computed stats.
import { fmtMoney, fmtMoneyRound, fmtHours, fmtHour12 } from './stats.js'

const pick = (arr, seed) => arr[seed % arr.length]

export function totalRoast(s) {
  if (s.total < 300)
    return 'A suspiciously restrained stretch. We checked the math twice.'
  if (s.total < 800)
    return 'Not terrible. Not great. Your wallet has filed a mild complaint.'
  if (s.total < 1500)
    return pick(
      [
        `Your card swiped ${s.count} times. It has requested a vacation.`,
        `${s.count} purchases. Your card knows more about you than your friends do.`,
      ],
      s.count
    )
  return "That's not a spending habit. That's a lifestyle brand."
}

export function deltaLine(s) {
  if (s.deltaPct == null) return null
  const pct = Math.abs(Math.round(s.deltaPct))
  if (pct < 5) return 'Basically identical to the month before. Consistency! Sort of.'
  return s.deltaPct > 0
    ? `That's up ${pct}% from the month before. Growth mindset, wrong department.`
    : `Down ${pct}% from the month before. Look at you, healing.`
}

export function hoursRoast(s) {
  const days = s.workDays
  if (days < 1)
    return 'Less than a workday of your life. Honestly? Respectable.'
  if (days < 3)
    return `That's ${days.toFixed(1)} full workdays you traded for stuff. Sit with that.`
  return `${days.toFixed(1)} workdays of your one wild and precious life, converted directly into packages.`
}

const CATEGORY_ROASTS = {
  Clothing: (c) => [
    `${c.count} clothing orders. You own sleeves you haven't even met yet.`,
    `${c.count} clothing hauls. Your closet is now load-bearing.`,
  ],
  'Food Delivery': (c) => [
    `${c.count} deliveries. Your stove thinks you moved out.`,
    `${c.count} deliveries. Your most-used kitchen appliance is the front door.`,
  ],
  Coffee: (c) => [
    `${c.count} coffees. At this point it's a subscription with extra steps.`,
    `${c.count} coffees. The baristas have a name for you. It's not flattering.`,
  ],
  Electronics: (c) => [
    `${c.count} gadgets. This one will definitely fix everything. Definitely.`,
  ],
  Impulse: (c) => [
    `${c.count} impulse buys. The algorithm knows your weaknesses, and so do we now.`,
  ],
  Subscriptions: (c) => [
    `${c.count} subscription charges. How many of these do you actually open?`,
  ],
  Beauty: (c) => [
    `${c.count} beauty orders. The shelf is full. The heart is not.`,
  ],
  Gaming: (c) => [
    `${c.count} game purchases. Your backlog called — it's unionizing.`,
  ],
  Groceries: () => ['Groceries. The one category we legally cannot roast.'],
  Home: (c) => [
    `${c.count} home purchases. Your place is 4% more decorated and 0% more peaceful.`,
  ],
  Books: (c) => [
    `${c.count} books. Buying them and reading them are separate hobbies, apparently.`,
  ],
  Misc: (c) => [
    `${c.count} purchases we couldn't even categorize. Chaos spending. Respect.`,
  ],
}

export function categoryRoast(s) {
  const c = s.topDiscretionary || s.topCategory
  if (!c) return ''
  const fn = CATEGORY_ROASTS[c.category]
  const opts = fn ? fn(c) : [`${c.count} purchases here. We don't even have a joke ready for this one.`]
  return pick(opts, c.count)
}

export function merchantRoast(s) {
  const m = s.topMerchant
  if (!m) return ''
  return pick(
    [
      `${m.count} transactions. That's not shopping, that's a situationship.`,
      `You visited ${m.name} ${m.count} times. They should know your order by now. They probably do.`,
    ],
    m.count
  )
}

export function lateNightRoast(s) {
  if (s.lateNight.count === 0)
    return 'Zero late-night purchases. Your sleep schedule is protecting your savings account.'
  return `${s.lateNight.count} purchases after 10pm, totaling ${fmtMoney(
    s.lateNight.total
  )}. Nothing good happens in the checkout tab after midnight.`
}

export function splurgeRoast(s, wage) {
  if (!s.biggest) return ''
  const hrs = fmtHours(s.biggest.price / wage)
  return `${fmtMoney(s.biggest.price)} at ${s.biggest.merchant}. That was ${hrs} of work. Worth it? Don't answer.`
}

export function skipRoast(s) {
  if (!s.skip) return null
  const amt = s.skip.total
  let alt
  if (amt >= 1000) alt = "that's a round-trip flight and a hotel"
  else if (amt >= 500) alt = "that's a whole weekend trip"
  else if (amt >= 200) alt = "that's a very nice dinner with change to spare"
  else alt = "that's a guilt-free cushion in your savings"
  return {
    category: s.skip.category,
    amount: fmtMoneyRound(amt),
    line: `Skip ${s.skip.category.toLowerCase()} next month and ${alt}.`,
  }
}

export function witchingHourLine(s) {
  return `Your wallet's witching hour is ${fmtHour12(s.busiestHour)}.`
}
