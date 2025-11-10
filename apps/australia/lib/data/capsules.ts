import { randomUUID } from 'node:crypto'
import dayjs from 'dayjs'

export interface Capsule {
    id: string
    openingDate: string
    content: string
    openingMessage?: string
}

export const capsules: Capsule[] = [
    {
        id: randomUUID(),
        openingDate: dayjs().format('YYYY-MM-DD'),
        content: 'Salut !',
        openingMessage: "Wow c'est ouvert",
    },
    {
        id: randomUUID(),
        openingDate: dayjs().add(1, 'd').format('YYYY-MM-DD'),
        content: 'Salut 2 !',
    },
    {
        id: randomUUID(),
        openingDate: dayjs().add(-2, 'd').format('YYYY-MM-DD'),
        content: `
      <h1>Test</h1>
      <div style="background: red">
        <p style="font-size: 25px; color: green;">
          Another test
        </p>
      </div>
    `,
        openingMessage: 'Wow 2 c\'est ouvert',
    },
    {
        id: randomUUID(),
        openingDate: dayjs().add(1, 'month').add(6, 'day').format('YYYY-MM-DD'),
        content: 'Salut !',
        openingMessage: "Wow c'est ouvert",
    },
    {
        id: randomUUID(),
        openingDate: dayjs().add(2, 'month').add(2, 'day').format('YYYY-MM-DD'),
        content: 'Salut 2 !',
    },
    {
        id: randomUUID(),
        openingDate: dayjs().add(4, 'month').add(-5, 'day').format('YYYY-MM-DD'),
        content: `
      <h1>Test</h1>
      <div style="background: red">
        <p style="font-size: 25px; color: green;">
          Another test
        </p>
      </div>
    `,
        openingMessage: 'Wow 2 c\'est ouvert',
    },
].sort((a, b) => a.openingDate.localeCompare(b.openingDate))

export const getCapsuleById = (id: string): Capsule | null => {
    return capsules.find(c => c.id === id) || null
}

export const getCapsulesByDay = (day: string): Capsule[] => {
    return capsules.filter(c => c.openingDate === day)
}

export const getCapsulesForCurrentMonth = (): Capsule[] => {
    const currentMonth = dayjs().format('YYYY-MM')
    return capsules.filter(c => dayjs(c.openingDate).format('YYYY-MM') === currentMonth)
}
