class SubmissionReportBuilder
  def initialize(data)
    @data = data
  end

  def build
    return nil unless @data.nrps? && @data.instructor?

    members = fetch_members
    lineitem = find_lineitem

    if lineitem.nil?
      return {
        lineitem: nil,
        submissions: members.map { |m| format_member(m, nil) },
      }
    end

    results = fetch_results(lineitem)
    results_by_user = results.index_by { |r| r[:userId] }

    {
      lineitem: lineitem.to_h,
      submissions: members.map { |m| format_member(m, results_by_user[m["user_id"]]) },
    }
  end

  private

  def fetch_members
    nrps  = LtiBridge::NRPS.new(
      access_token:    nrps_token,
      memberships_url: @data.nrps_context_memberships_url
    )
    nrps.members(query: { role: "Learner" })
  end

  def find_lineitem
    ags.find_line_item(
      lineitems_url:   @data.ags_lineitems,
      resource_link_id:@data.resource_link["id"]
    )
  end

  def fetch_results(lineitem)
    ags.get_results(lineitem_id: lineitem.id).map(&:to_h)
  end

  def platform
    @platform ||= Platform.find_by(issuer: @data.issuer, client_id: @data.audience)
  end

  def ags_token
    @ags_token ||= LtiBridge::AccessToken.fetch(
      client_id: platform.client_id,
      token_url: platform.token_url,
      scope:     @data.ags_scope
    )
  end

  def nrps_token
    @nrps_token ||= LtiBridge::AccessToken.fetch(
      client_id: platform.client_id,
      token_url: platform.token_url,
      scope:     @data.nrps_scope
    )
  end

  def ags
    @ags ||= LtiBridge::AGS.new(access_token: ags_token)
  end

  def format_member(member, result)
    {
      id: member["user_id"],
      username: member["ext_user_username"],
      name: member["name"],
      email: member["email"],
      role: member["roles"]&.map { |r| r.split("#").last }&.join(", "),
      user_id: member["user_id"],
      submitted: result.present?,
      score: result&.dig(:resultScore)
    }
  end



end
