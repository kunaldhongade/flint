from typing import Union
"""Settings for Social."""

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings


class SocialSettings(BaseSettings):
    """Configuration specific to the Flare ecosystem interactions."""

    # x(twitter) settings
    x_api_key:Union[ SecretStr, None ]= Field(
        default=None,
        description="API key for X.",
    )
    x_api_key_secret:Union[ SecretStr, None ]= Field(
        default=None,
        description="API key secret for X.",
    )
    x_access_token:Union[ SecretStr, None ]= Field(
        default=None,
        description="Access token key for X.",
    )
    x_access_token_secret:Union[ SecretStr, None ]= Field(
        default=None,
        description="Access token secret for X.",
    )
    # telegram settings
    telegram_api_token:Union[ SecretStr, None ]= Field(
        default=None,
        description="API key for Telegram.",
    )
    telegram_bot_token:Union[ SecretStr, None ]= Field(
        None,
        description="API key for Telegram.",
    )
    telegram_chat_id:Union[ SecretStr, None ]= Field(
        None,
        description="API key for Telegram.",
    )

    # Discord settings
    discord_bot_token:Union[ SecretStr, None ]= Field(
        None,
        description="Bot token for Discord.",
    )
    discord_channel_id:Union[ SecretStr, None ]= Field(
        None,
        description="Channel ID for Discord.",
    )

    # Slack settings
    slack_bot_token:Union[ SecretStr, None ]= Field(
        None,
        description="Bot token for Slack.",
    )
    slack_channel_id:Union[ SecretStr, None ]= Field(
        None,
        description="Channel name for Slack.",
    )

    # Farcaster settings
    farcaster_api_key:Union[ SecretStr, None ]= Field(
        None,
        description="API key for Farcaster.",
    )
    farcaster_signer_uuid:Union[ SecretStr, None ]= Field(
        None,
        description="Signer UUID for Farcaster.",
    )
    farcaster_fid:Union[ SecretStr, None ]= Field(
        None,
        description="Farcaster FID.",
    )
    farcaster_api_url:Union[ SecretStr, None ]= Field(
        None,
        description="Base URL for Farcaster API.",
    )

    # Github settings
    github_token:Union[ SecretStr, None ]= Field(
        None,
        description="Token for github.",
    )
    github_repo:Union[ SecretStr, None ]= Field(
        None,
        description="Repository for github.",
    )
