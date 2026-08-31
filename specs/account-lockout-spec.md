# Feature Spec: Account Lockout

## Goal
Lock accounts after 5 failed login attempts to prevent brute force attacks.

## Why This Matters
- Brute force attacks are common
- Rate limiting alone isn't enough
- Account lockout prevents credential stuffing

## What We Must Build

### Lockout Logic
- Track failed login attempts per user
- Lock after 5 failed attempts
- Lock duration: 15 minutes
- Reset on successful login

### User Experience
- Clear error message when locked
- "Try again in X minutes" message
- Unlock via email link (optional)

## Acceptance Criteria
- [ ] Failed attempts tracked
- [ ] Lock after 5 failures
- [ ] 15-minute lock duration
- [ ] Reset on successful login
- [ ] Clear error message
- [ ] Audit trail for lockouts
