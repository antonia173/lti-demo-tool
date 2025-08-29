Rails.application.routes.draw do

  post  '/lti/login',  to: 'lti#login'
  post '/lti/launch', to: 'lti#launch'

  get '/.well-known/jwks.json', to: 'lti#jwks', as: 'jwks'

  post  '/lti/deep_linking', to: 'lti#deep_linking'
  post '/lti/deep_linking_response', to: 'lti#deep_linking_response'

  match '/',   to: 'lti#practice_launch',   via: [:get, :post], as: :practice
  match '/assignment', to: 'lti#assignment_launch', via: [:get, :post]
  match '/help',       to: 'lti#help_launch',       via: [:get, :post]

  post '/lti/submit_score', to: 'lti#submit_score'

  get '/register', to: 'lti#register', as: 'register'
end
