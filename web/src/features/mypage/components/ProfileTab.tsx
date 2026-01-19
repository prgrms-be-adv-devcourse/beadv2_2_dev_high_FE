import { Divider, List, ListItem, ListItemText, Paper } from "@mui/material";
import { type User, type UserRoles } from "@moreauction/types";

interface ProfileTabProps {
  userInfo: User | null;
  roles?: UserRoles;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ userInfo, roles }) => {
  const roleLabel =
    Array.isArray(roles) && roles.length > 0 ? roles.join(", ") : "정보 없음";
  return (
    <Paper>
      <List>
        <ListItem>
          <ListItemText
            primary="닉네임"
            secondary={userInfo?.nickname || "정보 없음"}
          />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText
            primary="이름"
            secondary={userInfo?.name || "정보 없음"}
          />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText
            primary="닉네임"
            secondary={userInfo?.nickname || "정보 없음"}
          />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText
            primary="번호"
            secondary={userInfo?.phone_number || "정보 없음"}
          />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText
            primary="이메일"
            secondary={userInfo?.email || "정보 없음"}
          />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText
            primary="주소"
            secondary={
              userInfo
                ? `${userInfo.city ?? ""} ${userInfo.state ?? ""} ${
                    userInfo.zip_code ?? ""
                  }`
                : "정보 없음"
            }
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="상세주소"
            secondary={userInfo?.detail ?? "-"}
          />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText primary="역할" secondary={roleLabel} />
        </ListItem>
      </List>
    </Paper>
  );
};
