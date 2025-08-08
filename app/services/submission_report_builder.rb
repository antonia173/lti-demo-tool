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
    platform = Platform.find_by(issuer: @data.issuer, client_id: @data.audience)
    token = LtiBridge::AccessToken.fetch(client_id: platform.client_id, 
                                         token_url: platform.token_url,
                                         scope: @data.nrps_scope)
    nrps = LtiBridge::NRPS.new(access_token: token, memberships_url: @data.nrps_context_memberships_url)
    nrps.members(query: { role: "Learner" })
  end

  def find_lineitem
    platform = Platform.find_by(issuer: @data.issuer, client_id: @data.audience)
    token = LtiBridge::AccessToken.fetch(client_id: platform.client_id, 
                                         token_url: platform.token_url,
                                         scope: @data.ags_scope)
    LtiBridge::LineItem.find_by(
      access_token: token,
      lineitems_url: @data.ags_lineitems,
      resource_link_id: @data.resource_link["id"]
    )
  end

  def fetch_results(lineitem)
    platform = Platform.find_by(issuer: @data.issuer, client_id: @data.audience)
    token = LtiBridge::AccessToken.fetch(client_id: platform.client_id, 
                                            token_url: platform.token_url,
                                            scope: @data.ags_scope)
    ags = LtiBridge::AGS.new(access_token: token)
    ags.get_results(lineitem_id: lineitem.id).map(&:to_h)
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
