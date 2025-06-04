const nerdyAnnouncement = `🧠 *Scoring Patch Incoming @ 23:59!* 🧠

Heads up, forensic Wordlers! 🧬🔍

I’ve overhauled the scoring algorithm — and yes, it’s *finally deterministic*. Here's what's changing:

🟩 Early greens now get higher weight — we reward front-loading your logic.  
🟨 Yellows matter too (but no bonus for repeating evidence).  
🟨➜🟩 transitions are now traceable and rewarded.  
⬛ All-gray lines? Expect a minor penalty — no signal = no glory.  
🎯 Tie scores should now be rarer than a clean MD5 collision.

👀 The new logic will deploy *tonight at 23:59* (BST) to ensure today’s results aren’t contaminated. All tomorrow’s submissions will be scored with version 2.0 of the truth engine™.

As always:  
➤ Post your results  
➤ Trust the output  
➤ Respect the protocol 🧑‍💻`;

bot.sendMessage(process.env.GROUP_CHAT_ID, nerdyAnnouncement, { parse_mode: 'Markdown' });
