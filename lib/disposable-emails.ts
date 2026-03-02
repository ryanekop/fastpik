/**
 * Disposable/temporary email domain blocklist
 * Used to prevent abuse during registration
 */

const DISPOSABLE_DOMAINS = new Set([
    // Popular temporary email services
    'tempmail.com', 'temp-mail.org', 'temp-mail.io',
    'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamail.de',
    'guerrillamailblock.com', 'grr.la', 'sharklasers.com',
    'mailinator.com', 'mailinator2.com', 'mailinater.com',
    'throwaway.email', 'throwawaymail.com',
    'yopmail.com', 'yopmail.fr', 'yopmail.net',
    'dispostable.com', 'trashmail.com', 'trashmail.net', 'trashmail.me',
    'mailnesia.com', 'maildrop.cc', 'discard.email',
    'fakeinbox.com', 'fakemail.net', 'tempinbox.com',
    'getnada.com', 'nada.email',
    'tempail.com', 'tempr.email', 'tempmailaddress.com',
    'burnermail.io', 'inboxkitten.com',
    'mohmal.com', 'emailondeck.com',
    'crazymailing.com', 'mytemp.email',
    'harakirimail.com', 'mailcatch.com',
    'mintemail.com', 'tempmailo.com',
    'mailforspam.com', 'safetymail.info',
    'filzmail.com', 'mailnull.com',
    'spamgourmet.com', 'trashymail.com',
    'mailexpire.com', 'mailmoat.com',
    'mytrashmail.com', 'sharklasers.com',
    'spam4.me', 'spamfree24.org',
    'binkmail.com', 'bobmail.info',
    'chammy.info', 'devnullmail.com',
    'einrot.com', 'emailigo.de',
    'emailsensei.com', 'emailtemporario.com.br',
    'ephemail.net', 'getairmail.com',
    'guerrillamail.info', 'hmamail.com',
    'incognitomail.org', 'jetable.org',
    'kasmail.com', 'koszmail.pl',
    'kurzepost.de', 'mailblocks.com',
    'maildu.de', 'maileater.com',
    'mailhazard.com', 'mailhz.me',
    'mailin8r.com', 'mailnator.com',
    'mailquack.com', 'mailscrap.com',
    'mailshell.com', 'mailsiphon.com',
    'mailtemp.info', 'meltmail.com',
    'nospam.ze.tc', 'nowmymail.com',
    'objectmail.com', 'obobbo.com',
    'pookmail.com', 'proxymail.eu',
    'rcpt.at', 'reallymymail.com',
    'recode.me', 'regbypass.com',
    'safetypost.de', 'shortmail.net',
    'sneakemail.com', 'sogetthis.com',
    'spambox.us', 'spamcowboy.com',
    'spamex.com', 'spamherelots.com',
    'spaml.com', 'spamspot.com',
    'tempemail.net', 'tempinbox.co.uk',
    'tempomail.fr', 'temporaryemail.net',
    'temporarymail.org', 'thankyou2010.com',
    'trashemail.de', 'twinmail.de',
    'uggsrock.com', 'veryrealemail.com',
    'wegwerfmail.de', 'wegwerfmail.net',
    'wh4f.org', 'willhackforfood.biz',
    'xagloo.com', 'yep.it',
    'zippymail.info',
    // Indonesian temporary email services
    'tetsmails.com', 'emailfake.com',
    'luxusmail.org', 'mail-fake.com',
])

/**
 * Check if an email address uses a disposable/temporary email domain
 */
export function isDisposableEmail(email: string): boolean {
    const domain = email.split('@')[1]?.toLowerCase()
    if (!domain) return false
    return DISPOSABLE_DOMAINS.has(domain)
}
