class Platform < ApplicationRecord
  validates :issuer, :client_id, :auth_url, :token_url, :jwks_url, presence: true
  validates :issuer, uniqueness: { scope: :client_id }
end
