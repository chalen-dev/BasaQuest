// File: scripts/hash-password.ts
// Turns a password into a bcrypt hash that Supabase accepts, so a teammate
// can send the hash instead of the password itself:
//
//   npm run hash-password
//
// It asks for the password twice (typing is hidden), prints the hash and
// the line to paste into SEED_ADMIN_ACCOUNTS_JSON. Nothing is saved or sent
// anywhere; the password never leaves this computer.
//
// A hash is not the password, but anyone who gets it can try guesses against
// it offline — so use a long, unique password, and share the hash privately
// (a direct message, not a public channel).
import { createInterface } from 'node:readline'
import bcrypt from 'bcryptjs'

const COST = 12

async function main() {
    // One readline interface for both questions: input is read through an
    // async iterator so a second line that arrives together with the first
    // (pasted or piped input) isn't lost.
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    let muted = false
    // Hide what's typed: while `muted`, swallow every character readline would
    // echo back to the terminal.
    const internals = rl as unknown as { _writeToOutput: (s: string) => void }
    const echo = internals._writeToOutput.bind(rl)
    internals._writeToOutput = (s: string) => {
        if (!muted) echo(s)
    }
    const lines = rl[Symbol.asyncIterator]()
    const ask = async (question: string): Promise<string> => {
        process.stdout.write(question)
        muted = true
        const next = await lines.next()
        muted = false
        process.stdout.write('\n')
        if (next.done) throw new Error('No input received.')
        return next.value
    }

    const password = await ask('Password: ')
    if (password.length < 10) {
        console.error('Use at least 10 characters (a long passphrase is best).')
        process.exit(1)
    }
    const again = await ask('Type it again: ')
    rl.close()
    if (again !== password) {
        console.error("Those didn't match. Nothing was created.")
        process.exit(1)
    }
    const hash = await bcrypt.hash(password, COST)
    console.log('\nYour password hash (send this, not the password):\n')
    console.log(hash)
    console.log('\nSend it with your details, like this:\n')
    console.log(`Username: YOUR-USERNAME\nName: John Doe\nPassword hash: ${hash}\n`)
    process.exit(0)
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
})
