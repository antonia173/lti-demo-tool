class CreatePlatforms < ActiveRecord::Migration[6.1]
  def change
    create_table :platforms do |t|
      t.string :issuer, null: false
      t.string :client_id, null: false
      t.string :auth_url, null: false
      t.string :token_url, null: false
      t.string :jwks_url, null: false

      t.timestamps
    end

    add_index :platforms, [:issuer, :client_id], unique: true
  end
end
