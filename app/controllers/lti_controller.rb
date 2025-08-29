require 'lti_bridge'

class LtiController < ApplicationController
  skip_before_action :verify_authenticity_token

  def login
    platform = Platform.find_by(issuer: request.params["iss"], client_id: request.params["client_id"])
    login_url = LtiBridge::LoginInitiation.handle(request, platform.auth_url)
    redirect_to login_url, allow_other_host: true
  end

  def practice_launch
    @level = "normal"
    if params[:id_token].present?
      launch = LtiBridge::LaunchRequest.new(request)
      data = launch.data

      @name = data.given_name || data.name
    else
      @name = "player"
    end
  end

  def deep_linking
    return render(plain: "This page requires LTI 1.3 launch.", status: :unauthorized) unless params[:id_token].present?

    launch = LtiBridge::LaunchRequest.new(request)
	  @state = launch.state
    Rails.cache.write("launch_#{@state}", launch.data, expires_in: 15.minutes) 
  end

  def deep_linking_response
    state = params[:state]
    content_items = []

    if params[:add_assignment] == "1"
      level = params[:level]
      content_items << LtiBridge::ContentItem.lti_resource_link(
        url: assignment_url,
        title: "Asteroid game #{level}",
        text: "Assignment",
        custom: { "level" => level },
      )
    end

    if params[:add_practice] == "1"
      content_items << LtiBridge::ContentItem.lti_resource_link(
        url: practice_url,
        title: "Asteroid game practice"
      )
    end
    
    if params[:add_help] == "1"
      content_items << LtiBridge::ContentItem.lti_resource_link(
        url: help_url,
        title: "Asteroid game help"
      )
    end

    data = Rails.cache.read("launch_#{state}")
    if data.nil?
      render plain: "Invalid or expired launch state", status: :bad_request and return
    end

    form = LtiBridge::DeepLinkingResponse.new(
      launch_data: data,
      content_items: content_items
    )
    render html: form.form_html.html_safe
  end

  def assignment_launch
    return render(plain: "This page requires LTI 1.3 launch.", status: :unauthorized) unless params[:id_token].present?

    launch = LtiBridge::LaunchRequest.new(request)
    data = launch.data

    if data.nrps? && data.instructor?
      @report = SubmissionReportBuilder.new(data).build
      return render :submission_report
    end

	  @state = launch.state
    Rails.cache.write("launch_#{@state}", data, expires_in: 1.hour) 
    @name = data.given_name || data.name
    @level = data.custom["level"]
  end

  def help_launch
  end

  def submit_score
    state = params[:state]
    score = params[:score].to_f

    data = Rails.cache.read("launch_#{state}")
    return render plain: "Invalid or expired launch state", status: :bad_request if data.nil?

    platform = Platform.find_by(issuer: data.issuer, client_id: data.audience)
    ags_token = LtiBridge::AccessToken.fetch(client_id: platform.client_id, 
                                            token_url: platform.token_url,
                                            scope: data.ags_scope)
    ags = LtiBridge::AGS.new(access_token: ags_token)          
    
    line_item = ags.find_or_create_line_item(
      lineitems_url:   data.ags_lineitems,
      label:           data.resource_link["title"],
      score_maximum:   1.0,
      resource_link_id:data.resource_link["id"],
      tag:             "grade"
    )

    score_data = LtiBridge::Score.new(
        user_id: data.user_id,
        activity_progress: "Completed",
        grading_progress: "FullyGraded",
        score_given: score,
        score_maximum: 1.0
    )

    ags.submit_score(score: score_data, lineitem_id: line_item.id)

    respond_to do |format|
      format.js 
      format.any { render plain: "Unknown format: #{request.format}", status: :not_acceptable }
    end
  end

  def jwks
    jwk = LtiBridge::Jwk.build_from_env
    render json: { keys: [jwk] }
  end


  def register
    result = LtiBridge::DynamicRegistration.handle(
      request: request,
      tool_config_builder: tool_config_builder
    )
    
    platform = Platform.find_or_initialize_by(
      issuer: result[:platform][:issuer],
      client_id: result[:response][:client_id]
    )
    platform.update!(
      auth_url: result[:platform][:auth_url],
      token_url: result[:platform][:token_url],
      jwks_url: result[:platform][:jwks_url]
    )

    render html: LtiBridge::DynamicRegistration.html_page.html_safe, content_type: 'text/html', layout: false
  rescue => e
    render json: { error: e.message }, status: :unprocessable_entity
  end


  private

  def tool_config_builder
    LtiBridge::ToolConfiguration.new(
      initiate_login_url: lti_login_url,
      jwks_url: jwks_url,
      redirect_uris: [practice_url, assignment_url, lti_deep_linking_url, help_url],
      tool_name: "Asteroid Game Tool",
      root_url: practice_url,
      contact_emails: ["admin@yourdomain.com"],
      tool_description: "A simple LTI 1.3 game demo tool",
      messages: [
        {
          type: "LtiDeepLinkingRequest",
          target_link_uri: lti_deep_linking_url
        }
      ], 
      nrps: true,
      ags_grade_sync_column_mngmt: true,
      share_user_name: true,
      share_email: true
    )
  end


end
