/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your login link for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>ListHQ</Text>
        <Heading style={h1}>Your login link</Heading>
        <Text style={text}>
          Click the button below to log in to {siteName}. This link will expire
          shortly.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Log In
        </Button>
        <Text style={footer}>
          If you didn't request this link, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif', color: '#0f172a' }
const container = { padding: '32px 28px', maxWidth: '600px', margin: '0 auto' }
const brand = {
  fontSize: '24px',
  fontWeight: '700' as const,
  color: '#0f172a',
  letterSpacing: '-0.3px',
  margin: '0 0 24px',
}
const h1 = {
  fontSize: '28px',
  fontWeight: '600' as const,
  color: '#0f172a',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: '#475569',
  lineHeight: '1.5',
  margin: '0 0 16px',
}
const button = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontSize: '16px',
  borderRadius: '10px',
  padding: '14px 32px',
  textDecoration: 'none',
  display: 'inline-block',
  marginTop: '8px',
}
const footer = { fontSize: '13px', color: '#94a3b8', margin: '28px 0 0', fontStyle: 'italic' }
