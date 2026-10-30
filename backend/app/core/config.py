from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Optional
from app.core.constants import APP_NAME, APP_DESCRIPTION, APP_VERSION

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    app_name: str = Field(default=APP_NAME)
    app_description: str = Field(default=APP_DESCRIPTION)
    app_version: str = Field(default=APP_VERSION)
    app_env: str = Field(default="development")
    debug: bool = Field(default=True)
    log_level: str = Field(default="INFO")

    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)

    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://dev:dev@localhost:5432/sentin_ai"
    )

    # Elasticsearch
    elastic_url: str = Field(default="http://localhost:9200")
    elastic_api_key: Optional[str] = Field(default=None)

    # Gemini
    gemini_api_key: Optional[str] = Field(default=None)

    # PayPal Sandbox
    paypal_client_id: Optional[str] = Field(default=None)
    paypal_client_secret: Optional[str] = Field(default=None)
    paypal_base_url: str = Field(default="https://api-m.sandbox.paypal.com")
    paypal_business_account: Optional[str] = Field(default=None)
    paypal_buyer_account: Optional[str] = Field(default=None)
    paypal_webhook_id: Optional[str] = Field(default=None)
    paypal_seller_id: str = Field(default="seller_acme")

    # Autonomy & Decision Thresholds
    auto_triage_enabled: bool = Field(default=True)
    max_auto_execute_amount: float = Field(default=100.00)
    min_auto_execute_win_prob: float = Field(default=0.70)
    max_customer_risk_score: float = Field(default=0.50)

settings = Settings()
